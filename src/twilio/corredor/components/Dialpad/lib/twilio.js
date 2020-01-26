import { EventEmitter } from 'events'
import TwilioClient from 'twilio-client'

const defaultDeviceConfig = {
  enableRingingState: true,
  allowIncomingWhileBusy: false,
  debug: true,
  warnings: true,
  closeProtection: true,
}

const defaultActivities = {
  available: 'Available',
  pending: 'Call Pending',
  busy: 'On a Call',
  offline: 'Offline',
}

/**
 * Twilio class provides an interface for Twilio API.
 *
 * The class handles most of the heavy lifting regarding call management, but
 * it leaves most of user interactions to the user interface component.
 * It also does not bother with any logging and data enrichment -- that should be done
 * outside of this class.
 */
export default class Twilio extends EventEmitter {
  static events = {
    deviceReady: 'device.ready',
    workerReady: 'worker.ready',
    workersInitialized: 'workers.initialized',
    workerTokenUpdated: 'worker.token.updated',
    workerReservationCreated: 'worker.reservation.created',
    workerReservationCompleted: 'worker.reservation.completed',
    workerActivityUpdate: 'worker.activity.update',
    error: 'err',

    callOutboundConnected: 'call.outbound.connected',
    callOutboundDisconnected: 'call.outbound.disconnected',

    callInboundConnected: 'call.inbound.connected',
    callInboundDisconnected: 'call.inbound.disconnected',
    callInboundPending: 'call.inbound.pending',
    callInboundCanceled: 'call.inbound.canceled',
  }

  constructor (user, { deviceConfig = {}, activities = {} } = {}) {
    super()
    this.deviceConfig = { ...defaultDeviceConfig, ...deviceConfig }
    this.activities = { ...defaultActivities, activities }

    this.user = user
    this.workers = []
    this.device = undefined
    this.currentCall = undefined
  }

  /**
   * API interface
   * ----------------------------------------------------------------------
   */

  /**
   * init method initializes Twilio communication:
   *  * device,
   *  * capability token,
   *  * worker tokens,
   *  * events,
   *  * ...
   */
  async init () {
    return this.checkEnv()
      .then(() => this.initDevice())
      .then(() => this.bindDeviceListeners())
      .then(() => this.initWorkers())
      .then(() => this.bindWorkerListeners())
      .then(() => {
        this.emit(Twilio.workersInitialized, true)
        return this
      })
  }

  /**
   * answerCall method answers the current pending call
   */
  async answerCall () {
    if (!this.currentCall) {
      throw new Error('call.notDefined')
    }

    // Sync workers as busy and accept the call
    return this.syncWorkerActivities(this.activities.pending)
      .then(() => {
        this.currentCall.accept()
      })
      .catch(err => this.stdErr(err))
  }

  /**
   * declineCall method declines the current pending call
   */
  async declineCall () {
    if (!this.currentCall) {
      throw new Error('call.notDefined')
    }

    // Sync workers as available and reject
    return this.syncWorkerActivities(this.activities.available)
      .finally(() => {
        this.currentCall.reject()
        this.currentCall = undefined
        this.device.disconnectAll()
      })
  }

  /**
   * hangupCall method hangs up the current active call.
   * It does not update the worker's status in case of further script manipulation.
   */
  async hangupCall () {
    if (!this.currentCall) {
      return
    }

    this.device.disconnectAll()
    this.currentCall = undefined
  }

  /**
   * agentReady updates agent's worker statuses so they can receive the next call
   */
  async agentReady () {
    return this.syncWorkerActivities(this.activities.available)
  }

  /**
   * allActivities provides a full list of activities that the agent can appear in
   * @returns {Promise<Array<String>>}
   */
  async allActivities () {
    // Get all activities that should be shown to the agent
    const activities = this.workers
      .map(({ activities = {} }) => Object.keys(activities))
      .reduce((acc, cur) => acc.concat(cur), [])

    return Array.from(new Set(activities))
  }

  /**
   * setWorkerActivity sets the given activity for all workers
   * @param {String} activity Activity to update to
   * @returns {Promise<*>}
   */
  async setWorkerActivity (activity) {
    return this.syncWorkerActivities(activity)
  }

  /**
   * setCallerID sets the caller ID for the given user
   * @todo implement if needed
   * @param {String} callerID CallerID to update to
   * @returns {Promise<*>}
   */
  async setCallerID (callerID) {
    return callerID
  }

  /**
   * call method initializes the call to the provided number
   * @todo implement if needed
   * @param {String} number The number that we should call
   */
  async call (number) {
    // @todo...
  }

  /**
   * sendSig method sends a DTMF signal
   * @todo implement if needed
   * @param {String} signal The signal to dispatch
   */
  async sendSig (signal) {
    if (!this.currentCall) {
      throw new Error('call.notDefined')
    }
    if (signal === undefined) {
      throw new Error('call.signalNotDefined')
    }
    // @todo...
  }

  /**
   * Internal methods
   * ----------------------------------------------------------------------
   */

  /**
   * checkEnv method checks environments i/o devices
   * @returns {Promise<*>}
   */
  async checkEnv () {
    return new Promise((resolve, reject) => {
      // Cross browser things
      navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia

      // platform doesn't support required i/o devices
      if (!navigator.getUserMedia) {
        reject(new Error('platform.notSupported'))
      }

      navigator.getUserMedia({ audio: true }, resolve, reject)
    })
  }

  /**
   * initDevice initializes the device with capability token
   */
  async initDevice () {
    const cpt = await this.getCapabilityToken(this.user)
    this.device = new TwilioClient.Device(cpt, this.deviceConfig)
  }

  /**
   * initWorkers initializes the current user's workflow workers
   */
  async initWorkers () {
    const rawWorkers = await this.getWorkerTokens(this.user)
    this.workers = rawWorkers.map(w => {
      // Get the offline activity sid
      const offlineActivity = w.activities[Object.keys(w.activities).find(activity => activity === this.activities.offline)]
      // Initialize the worker
      const worker = new window.Twilio.TaskRouter.Worker(w.token, true, '', offlineActivity, true)
      return {
        ...w,
        worker,
        status: offlineActivity,
      }
    })
  }

  /**
   * bindDeviceListeners handles important device events
   */
  async bindDeviceListeners () {
    const isInbound = connection => connection._direction !== 'OUTGOING'

    /**
     * Fires when the connection is opened via `.connect()` or via an accepted incoming connection
     */
    this.device.on('connect', connection => {
      console.debug('device.connect', connection)
      if (connection._direction === 'OUTGOING') {
        this.$emit(Twilio.events.callOutboundConnected, connection)
      } else {
        this.$emit(Twilio.events.callInboundConnected, connection)
      }

      // This fires when the connection gets terminated
      connection.on('disconnect', conn => {
        console.debug('connection.disconnect', conn)
        if (conn._direction === 'OUTGOING') {
          this.$emit(Twilio.events.callOutboundDisconnected, conn)
        } else {
          this.$emit(Twilio.events.callInboundDisconnected, conn)
        }

        // Disconnect all calls for this device
        this.stdDisconnect()
      })

      // This fires when the connection gets aborted when an error occurs
      connection.on('cancel', err => {
        console.debug('connection.cancel', err)
        this.stdErr(err)
      })
    })

    // When the agent receives a call
    this.device.on('incoming', connection => {
      console.debug('device.incoming', connection)

      // Take note of the current call for future refs
      this.currentCall = connection
      this.$emit(Twilio.events.callInboundPending, connection, isInbound(connection))

      // mark workers as pending for a call
      this.syncWorkerActivities(this.activities.pending)
        .catch(err => {
          this.stdErr(err)
        })
    })

    // This fires when the caller cancels the call before the agent manages
    // to pick up the phone
    this.device.on('cancel', connection => {
      console.debug('device.cancel', connection)
      this.stdDisconnect()
      this.$emit(Twilio.events.callInboundCanceled, connection)
    })

    // This fires when the device is initialized and ready for interactions
    this.device.on('ready', device => {
      console.debug('device.ready', device)
      this.$emit(Twilio.events.deviceReady, device)
    })

    // This fires when an error occurs
    this.device.on('error', err => {
      console.debug('Device.error', err)
      this.stdErr(err)
    })
  }

  /**
   * bindWorkerListeners handles important worker events
   */
  async bindWorkerListeners () {
    this.workers.forEach(w => {
      w.on('ready', evt => {
        console.debug('worker.ready', evt)
        this.emit(Twilio.events.workerReady, evt)
      })

      /**
       * This fires when a worker's activity was updated.
       * It syncs the activity across all workers
       */
      w.on('activity.update', worker => {
        console.debug('activity.update', worker)
        this.workers.forEach(w => {
          if (w.worker.workerSid !== worker.workerSid) {
            // @todo err handling
            this.syncWorkerActivities(worker.activityName, w.worker)
          }
        })
        this.emit(Twilio.events.workerActivityUpdate, worker)
      })

      /**
       * Handles token expiration.
       * Generates a new worker token and replaces the expired one
       */
      w.on('token.expired', async () => {
        console.debug('token.expired', w)
        // Generate a new token for this worker
        const { token } = await this.getWorkerTokens(this.user, w)
        w.updateToken(token)
        // Event for the component
        this.emit(Twilio.events.workerTokenUpdated, w)
      })

      /**
       * Use this event to handle reservation management.
       * This an be omitted and handled server-side
       */
      w.on('reservation.created', reservation => {
        console.debug('reservation.created', reservation)
        this.emit(Twilio.events.workerReservationCreated, reservation)
      })

      /**
       * This fires when the entire task is completed
       */
      w.on('reservation.completed', reservation => {
        console.debug('reservation.completed', reservation)
        this.emit(Twilio.events.workerReservationCompleted, reservation)
      })
    })
  }

  /**
   * syncWorkerActivities syncs the given activity with the given worker or all workers
   * if no worker is provided
   * @param {String} activity The activity to sync to
   * @param {Object|undefined} worker Optional worker to use
   */
  async syncWorkerActivities (activity, worker) {
    return new Promise((resolve, reject) => {
    /**
     * std handler for the worker update operation response
     * @param {Error|undefined} err If an error occurs the argument is provided, else it's null
     * @param {Object} worker Updated worker if the update was successful
     */
      const handler = (err, worker) => {
        if (err) {
          reject(err)
        } else {
          resolve(worker)
        }
      }
      if (!worker) {
        worker = this.workers[0]
      }
      worker.update(
        { ActivitySid: worker.activities[activity] },
        handler,
      )
    })
  }

  /**
   * stdErr is a standard err handler. It emits the event and resets the state
   * to avoid undefined system state
   * @param {Error} err The error to handle
   */
  stdErr (err) {
    this.stdDisconnect()
    this.emit(Twilio.events.error, err)
  }

  /**
   * stdDisconnect defines a standard flow for disconnecting calls
   */
  stdDisconnect () {
    this.device.disconnectAll()
    this.currentCall = undefined
  }

  /**
   * Mocks
   * ----------------------------------------------------------------------
   */

  async getCapabilityToken (tmp = {}) {
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6InNjb3BlOmNsaWVudDppbmNvbWluZz9jbGllbnROYW1lPXR0IiwiaXNzIjoiQUNiNWNhMzNjYzE3YTBlMjNmNTBkNTc1NGM2ODI1NzY5NyIsImV4cCI6MTU3OTA5NjQ4OSwiaWF0IjoxNTc5MDEwMDg5fQ.kiiSVdVut5u8Jedg2DHQgZG_hALjGZIg01hro7zj9iA'
  }

  async getWorkerTokens (tmp = {}, { workerSid } = {}) {
    const ts = [{
      workspaceSid: 'WS.000',
      workerSid: 'WK.000',
      // token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwb2xpY2llcyI6W3siYWxsb3ciOnRydWUsInBvc3RfZmlsdGVyIjp7fSwicXVlcnlfZmlsdGVyIjp7fSwibWV0aG9kIjoiR0VUIiwidXJsIjoiaHR0cHM6Ly9ldmVudC1icmlkZ2UudHdpbGlvLmNvbS92MS93c2NoYW5uZWxzL0FDYjVjYTMzY2MxN2EwZTIzZjUwZDU3NTRjNjgyNTc2OTcvV0thZTdjMzJiMGI1MGZiYmU5OWM1ODQxNWQyMjFiOWVjOCJ9LHsiYWxsb3ciOnRydWUsInBvc3RfZmlsdGVyIjp7fSwicXVlcnlfZmlsdGVyIjp7fSwibWV0aG9kIjoiUE9TVCIsInVybCI6Imh0dHBzOi8vZXZlbnQtYnJpZGdlLnR3aWxpby5jb20vdjEvd3NjaGFubmVscy9BQ2I1Y2EzM2NjMTdhMGUyM2Y1MGQ1NzU0YzY4MjU3Njk3L1dLYWU3YzMyYjBiNTBmYmJlOTljNTg0MTVkMjIxYjllYzgifSx7ImFsbG93Ijp0cnVlLCJwb3N0X2ZpbHRlciI6e30sInF1ZXJ5X2ZpbHRlciI6e30sIm1ldGhvZCI6IkdFVCIsInVybCI6Imh0dHBzOi8vdGFza3JvdXRlci50d2lsaW8uY29tL3YxL1dvcmtzcGFjZXMvV1M3MGMxZTk1MThjMDg3MzQyMGJjMjY3ZmNlNGYyZDFkOS9BY3Rpdml0aWVzIn0seyJhbGxvdyI6dHJ1ZSwicG9zdF9maWx0ZXIiOnsiUmVzZXJ2YXRpb25TdGF0dXMiOnsicmVxdWlyZWQiOnRydWV9fSwicXVlcnlfZmlsdGVyIjp7fSwibWV0aG9kIjoiUE9TVCIsInVybCI6Imh0dHBzOi8vdGFza3JvdXRlci50d2lsaW8uY29tL3YxL1dvcmtzcGFjZXMvV1M3MGMxZTk1MThjMDg3MzQyMGJjMjY3ZmNlNGYyZDFkOS9UYXNrcy8qKiJ9LHsiYWxsb3ciOnRydWUsInBvc3RfZmlsdGVyIjp7IkFjdGl2aXR5U2lkIjp7InJlcXVpcmVkIjp0cnVlfX0sInF1ZXJ5X2ZpbHRlciI6e30sIm1ldGhvZCI6IlBPU1QiLCJ1cmwiOiJodHRwczovL3Rhc2tyb3V0ZXIudHdpbGlvLmNvbS92MS9Xb3Jrc3BhY2VzL1dTNzBjMWU5NTE4YzA4NzM0MjBiYzI2N2ZjZTRmMmQxZDkvV29ya2Vycy9XS2FlN2MzMmIwYjUwZmJiZTk5YzU4NDE1ZDIyMWI5ZWM4In0seyJhbGxvdyI6dHJ1ZSwicG9zdF9maWx0ZXIiOnt9LCJxdWVyeV9maWx0ZXIiOnt9LCJtZXRob2QiOiJHRVQiLCJ1cmwiOiJodHRwczovL3Rhc2tyb3V0ZXIudHdpbGlvLmNvbS92MS9Xb3Jrc3BhY2VzL1dTNzBjMWU5NTE4YzA4NzM0MjBiYzI2N2ZjZTRmMmQxZDkvV29ya2Vycy9XS2FlN2MzMmIwYjUwZmJiZTk5YzU4NDE1ZDIyMWI5ZWM4In1dLCJjaGFubmVsIjoiV0thZTdjMzJiMGI1MGZiYmU5OWM1ODQxNWQyMjFiOWVjOCIsIndvcmtzcGFjZV9zaWQiOiJXUzcwYzFlOTUxOGMwODczNDIwYmMyNjdmY2U0ZjJkMWQ5IiwiYWNjb3VudF9zaWQiOiJBQ2I1Y2EzM2NjMTdhMGUyM2Y1MGQ1NzU0YzY4MjU3Njk3Iiwid29ya2VyX3NpZCI6IldLYWU3YzMyYjBiNTBmYmJlOTljNTg0MTVkMjIxYjllYzgiLCJ2ZXJzaW9uIjoidjEiLCJleHAiOjE1Nzk1MTkyOTcsImlzcyI6IkFDYjVjYTMzY2MxN2EwZTIzZjUwZDU3NTRjNjgyNTc2OTcifQ.c9iQJiu3p5vmnx5X5U_e_pd_sBzmsg2A5XRJDRG3LmA',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6InNjb3BlOmNsaWVudDppbmNvbWluZz9jbGllbnROYW1lPXR0IiwiaXNzIjoiQUNiNWNhMzNjYzE3YTBlMjNmNTBkNTc1NGM2ODI1NzY5NyIsImV4cCI6MTU3OTA5NjQ4OSwiaWF0IjoxNTc5MDEwMDg5fQ.kiiSVdVut5u8Jedg2DHQgZG_hALjGZIg01hro7zj9iA',
      activities: {
        Reserved: 'WA5f008317b9e0c4e30980e5dcb0b516db',
        Busy: 'WAfe058dbb31cda4f903f38b30bd04661b',
        Idle: 'WAa875abaadbaf71946b24b23f06116242',
        Offline: 'WAc3399bb137cbff8529803e9c077c8682',
      },
    }]

    if (workerSid) {
      return ts[0]
    }
    return ts
  }
}
