import { EventEmitter } from 'events'
import TwilioClient from 'twilio-client'

const defaultDeviceConfig = {
  enableRingingState: true,
  allowIncomingWhileBusy: false,
  debug: true,
  warnings: true,
  closeProtection: true,
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

  constructor (user, apiClient, { deviceConfig = {}, activities = {}, ns = 'ob' } = {}) {
    super()
    this.deviceConfig = { ...defaultDeviceConfig, ...deviceConfig }
    this.activities = {
      available: 'Idle',
      pending: 'Reserved',
      busy: 'Busy',
      offline: 'Offline',
      wrapUp: 'WrapUp',
    }

    this.user = user
    this.apiClient = apiClient
    this.ns = ns
    this.workers = []
    this.device = undefined
    this.currentCall = undefined
    this.currentReservation = undefined
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

    this.currentCall.accept()
  }

  /**
   * declineCall method declines the current pending call
   */
  async declineCall () {
    if (!this.currentCall) {
      throw new Error('call.notDefined')
    }

    this.currentCall.reject()
    this.device.disconnectAll()
    this.currentCall = undefined
  }

  /**
   * hangupCall method hangs up the current active call.
   * It does not update the worker's status in case of further script manipulation.
   */
  async hangupCall () {
    if (!this.currentCall) {
      return
    }

    this.currentCall.disconnect()
    this.currentCall = undefined
    this.device.disconnectAll()
  }

  /**
   * agentReady updates agent's worker statuses so they can receive the next call
   */
  async agentReady () {
    return this.syncWorkerActivities(this.activities.available)
  }

  /**
   * agentWrappingUp updates agent's worker statuses to indicate call finalization
   */
  async agentWrappingUp () {
    return this.syncWorkerActivities(this.activities.wrapUp)
  }

  /**
   * agentPending updates agent's worker statuses to indicate a pending call
   */
  async agentPending () {
    return this.syncWorkerActivities(this.activities.pending)
  }

  /**
   * agentBusy updates agent's worker statuses to indicate a busy agent
   */
  async agentBusy () {
    return this.syncWorkerActivities(this.activities.busy)
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
   * allActivities provides a full list of activities that the agent can appear in
   * @returns {Promise<Array<String>>}
   */
  async allActivities () {
    return Object.values(this.activities)
  }

  /**
   * call method initializes the call to the provided number
   * @todo implement if needed
   * @param {String} number The number that we should call
   */
  async call ({ From, To, RecordType = 'record-from-answer' }) {
    return this.syncWorkerActivities(this.activities.pending)
      .then(() => {
        return this.device.connect({ From, To, RecordType })
      })
      .catch(err => this.stdErr(err))
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
    this.currentCall.sendDigits(signal)
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
    const { jwt } = await this.apiClient.authCapability({ userID: this.user.userID, ns: this.ns })
    this.device = new TwilioClient.Device(jwt, this.deviceConfig)
  }

  /**
   * initWorkers initializes the current user's workflow workers
   */
  async initWorkers () {
    const { workers: rawWorkers } = await this.apiClient.authWorker({ userID: this.user.userID, ns: this.ns })
    this.workers = rawWorkers.map(w => {
      // check if all required activities are there
      if (Object.values(this.activities).find(a => !w.worker.activities[a])) {
        console.warn('worker.invalidActivities', w)
        return undefined
      }

      // Get the offline activity sid
      const offlineActivity = w.worker.activities[Object.keys(w.worker.activities).find(activity => activity === this.activities.offline)]
      // Initialize the worker
      const worker = new window.Twilio.TaskRouter.Worker(w.token, true, '', offlineActivity, true)
      return {
        ...w,
        client: worker,
        status: offlineActivity,
      }
    })
  }

  /**
   * bindDeviceListeners handles important device events
   */
  async bindDeviceListeners () {
    /**
     * Fires when the connection is opened via `.connect()` or via an accepted incoming connection
     */
    this.device.on('connect', connection => {
      console.debug('device.connect', connection)
      this.currentCall = connection

      if (connection._direction === 'OUTGOING') {
        this.emit(Twilio.events.callOutboundConnected, connection)
      } else {
        this.emit(Twilio.events.callInboundConnected, connection)
      }

      // mark workers as pending for a call
      if (!this.currentReservation) {
        // workflow does this automatically
        this.syncWorkerActivities(this.activities.pending)
          .catch(err => {
            this.stdErr(err)
          })
      }

      // This fires when the connection gets terminated
      connection.on('disconnect', conn => {
        console.debug('connection.disconnect', conn)
        if (conn._direction === 'OUTGOING') {
          this.emit(Twilio.events.callOutboundDisconnected, conn)
        } else {
          this.emit(Twilio.events.callInboundDisconnected, conn)
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
      this.emit(Twilio.events.callInboundPending, connection)
    })

    // This fires when the caller cancels the call before the agent manages
    // to pick up the phone
    this.device.on('cancel', connection => {
      console.debug('device.cancel', connection)
      this.stdDisconnect()
      this.emit(Twilio.events.callInboundCanceled, connection)
    })

    // This fires when the device is initialized and ready for interactions
    this.device.on('ready', device => {
      console.debug('device.ready', device)
      this.emit(Twilio.events.deviceReady, device)
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
      w.client.on('ready', evt => {
        console.debug('worker.ready', evt)
        this.emit(Twilio.events.workerReady, evt)
      })

      /**
       * This fires when a worker's activity was updated.
       * It syncs the activity across all workers
       */
      w.client.on('activity.update', worker => {
        console.debug('activity.update', worker)
        this.workers.forEach(w => {
          if (w.worker.workerSid !== worker.workerSid && w.client.activityName !== worker.activityName) {
            this.syncWorkerActivities(worker.activityName, w)
          }
        })
        this.emit(Twilio.events.workerActivityUpdate, worker)
      })

      /**
       * Handles token expiration.
       * Generates a new worker token and replaces the expired one
       */
      w.client.on('token.expired', async () => {
        console.debug('token.expired', w)
        // Generate a new token for this worker
        const { workers: rawWorkers } = await this.apiClient.authWorker({ userID: this.user.userID, ns: this.ns, workerID: w.worker.workerID })
        if (!rawWorkers || !rawWorkers.length) {
          return
        }
        const [{ token } = {}] = rawWorkers

        w.client.updateToken(token)
        // Event for the component
        this.emit(Twilio.events.workerTokenUpdated, w)
      })

      /**
       * Use this event to handle reservation management.
       * This an be omitted and handled server-side
       */
      w.client.on('reservation.created', reservation => {
        console.debug('reservation.created', reservation)
        this.currentReservation = reservation
        this.emit(Twilio.events.workerReservationCreated, reservation)
      })

      /**
       * This fires when the entire task is completed
       */
      w.client.on('reservation.completed', reservation => {
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
    // no workers, no syncing
    if (!this.workers.length) {
      return true
    }

    return new Promise((resolve, reject) => {
    /**
     * std handler for the worker update operation response
     * @param {Error|undefined} err If an error occurs the argument is provided, else it's null
     * @param {Object} worker Updated worker if the update was successful
     */
      const handler = (_, worker) => {
        resolve(worker)
      }
      if (!worker) {
        worker = this.workers[0]
      }
      if (!worker) {
        return true
      }
      worker.client.update(
        { ActivitySid: worker.worker.activities[activity] },
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
    if (this.currentCall) {
      this.currentCall.reject()
      this.currentCall = undefined
    }
    this.device.disconnectAll()
  }
}
