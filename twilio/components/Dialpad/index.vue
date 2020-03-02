<template>
  <b-container>
    <!-- Component's state configuration -->
    <state-config
      v-model="state"
      :activities="activities"
      :caller-i-ds="callerIDs"
      worker-status-label="Worker statuses#"
      caller-i-ds-label="Caller IDs#"
      class="mb-3"
    />

    <!-- Call state management and display -->
    <call-state
      v-if="call && call.connection"
      :call="call"
      @answer="onAnswer"
      @decline="onDecline"
      @hangup="onHangup"
    >
      <template #call.answer.content>
        Answer#
      </template>
      <template #call.decline.content>
        Decline#
      </template>
      <template #call.hangup.content>
        Hangup#
      </template>
    </call-state>

    <!-- Dialpad for calling external numbers and sending DTMF signals -->
    <dial-pad
      v-model="phoneNumber"
      class="my-3"
      @dial-pad="onDialpad"
    >
      <template #dialPad.actionRow>
        <b-btn
          v-if="call.state === callStates.inactive"
          variant="success"
          @click="onCall"
        >
          Call#
        </b-btn>
      </template>
    </dial-pad>

    <!-- Agent's call script management; display and editing -->
    <call-script
      v-if="script"
      :script="script"
    />
    <b-row v-if="call.state === callStates.finalize">
      <!-- Script actions section -->
      <b-col
        cols="12"
        class="text-right"
      >
        <b-btn-group size="sm">
          <b-btn
            variant="success"
            @click="onScriptComplete"
          >
            Save the interaction#
          </b-btn>
          <b-btn
            variant="danger"
            @click="onScriptDiscard"
          >
            Discard the interaction#
          </b-btn>
        </b-btn-group>
      </b-col>
    </b-row>

    <error-log
      v-if="errors && errors.length"
      :errors="errors"
    />
  </b-container>
</template>

<script>
import {
  Twilio,
  APIClient,
  callKinds,
  callStates,
} from './lib'

import {
  StateConfig,
  CallState,
  DialPad,
  CallScript,
  ErrorLog,
} from './components'

export default {
  components: {
    StateConfig,
    CallState,
    DialPad,
    CallScript,
    ErrorLog,
  },

  props: {
    apiBaseURL: {
      type: String,
      required: true,
      default: '',
    },
    apiSign: {
      type: String,
      required: true,
      default: '',
    },
    ns: {
      type: String,
      required: true,
      default: '',
    },
    user: {
      type: Object,
      required: true,
      default: () => ({}),
    },
  },

  data () {
    return {
      /**
       * Component management paramaters
       */
      state: {
        activity: 'Offline',
        callerID: undefined,
        deviceReady: false,
        workerReady: false,
      },
      activities: [],
      callerIDs: [],
      callManager: undefined,
      apiClient: new APIClient({
        baseURL: this.apiBaseURL,
        sign: this.apiSign,
      }),

      phoneNumber: undefined,

      /**
       * Call state management paramaters
       */
      call: {
        kind: undefined,
        state: callStates.inactive,
        connection: undefined,
        reservation: undefined,
        from: undefined,
        to: undefined,
        callCenterID: undefined,
        startedAt: undefined,
        callSid: undefined,

        label: undefined,
        description: undefined,
        details: undefined,
      },

      errors: [],
      script: undefined,

      callStates,
    }
  },

  watch: {
    'state.activity': {
      handler: function (activity) {
        this.callManager.syncWorkerActivities(activity)
          .catch(err => this.stdErr(err))
      },
    },
  },

  mounted () {
    this.$nextTick(async () => {
      this.init()
    })
  },

  methods: {
    /**
     * init initializes callManager and it's listeners objects
     */
    async init () {
      // Setup call manager and handle it's events
      this.callManager = await new Twilio(this.user, this.apiClient).init()

      // * activity management
      this.callManager.on(Twilio.events.workerActivityUpdate, this.onWorkerActivityUpdate)

      // * call management
      this.callManager.on(Twilio.events.callInboundPending, this.onInboundCall)
      this.callManager.on(Twilio.events.callInboundConnected, this.onCallStartedInbound)
      this.callManager.on(Twilio.events.callInboundDisconnected, this.onCallEnded)
      this.callManager.on(Twilio.events.callInboundCanceled, this.onResetState)
      this.callManager.on(Twilio.events.workerReservationCreated, this.onReservation)

      this.callManager.on(Twilio.events.callOutboundConnected, this.onCallStartedOutbound)
      this.callManager.on(Twilio.events.callOutboundDisconnected, this.onCallEnded)

      // * state
      this.callManager.on(Twilio.events.error, this.stdErr)

      // call manager misc operations
      this.activities = await this.callManager.allActivities()

      // Setup Corteza manager
      this.callerIDs = await this.apiClient.workerCallerIDs({ userID: this.user.userID, ns: this.ns })
        .then(({ callerID }) => callerID)
      this.state.callerID = (this.callerIDs[0] || {}).value
    },

    /**
     * onWorkerActivityUpdate updates the worker activity display
     */
    onWorkerActivityUpdate ({ activityName } = {}) {
      this.state.activity = activityName
    },

    /**
     * onCallEnded handles call logging
     */
    onCallEnded () {
      // This is required, since it's not automatically handled by Twilio
      if (this.call.kind === callKinds.outbound || !this.call.reservation) {
        this.callManager.agentWrappingUp()
      }

      if (!this.script) {
        this.call.state = callStates.ended
        this.apiClient.logCall(this.call, this.ns)
        this.onResetState()
      } else {
        this.call.state = callStates.finalize
      }
    },

    /**
     * onStdCallStarted is a standard call start handler
     * @param {Object} connection Twilio connection object
     */
    onStdCallStarted (connection) {
      this.call.state = callStates.inProgress
      this.call.connection = connection
      this.call.startedAt = new Date()
    },

    /**
     * onReservation handles reservation creation.
     * Used mailny for activity meta information
     * @param {Object} reservation Twilio reservation object
     */
    onReservation (reservation) {
      this.call.reservation = reservation
    },

    /**
     * onStdCallStarted handles started inbound calls
     * @param {Object} connection Twilio connection object
     */
    onCallStartedInbound (connection) {
      this.onStdCallStarted(connection)

      // get callers information
      if (this.call.reservation) {
        this.call.to = this.call.reservation.task.attributes.to
      }
      this.prepareInteraction(this.call.to)
    },

    /**
     * onCallStartedOutbound handles started outbound calls
     * @param {Object} connection Twilio connection object
     */
    onCallStartedOutbound (connection) {
      this.call.callSid = connection.parameters.CallSid
      this.call.kind = callKinds.outbound
      this.call.from = connection.message.From
      this.call.to = connection.message.To
      this.onStdCallStarted(connection)

      // get callers information
      this.enrichCall(connection.message.To)
      this.prepareInteraction(connection.message.From)
    },

    /**
     * enrichCall method enriches the given phone number's information with
     * the help of compose.
     * @param {String} phoneNumber The phone number to enrich
     */
    enrichCall (phoneNumber) {
      this.apiClient.callInfo({ phoneNumber, ns: this.ns })
        .then(details => {
          this.call.details = details
          const caller = details.caller || {}
          const contact = details.contact || {}
          const lead = details.lead || {}
          this.call.label = (caller.values || {}).Name || (contact.values || {}).FirstName || (lead.values || {}).FirstName
          if (this.call.label) {
            this.call.description = phoneNumber
          } else {
            this.call.label = phoneNumber
          }
        })
    },

    /**
     * prepareInteraction method attempts to prepare an interaction based
     * on the call center's script
     * @param {String} phoneNumber
     */
    prepareInteraction (phoneNumber, ns = this.ns) {
      this.apiClient.callScript({ phoneNumber, ns })
        .then(({ scripts: [script] }) => {
          if (script) {
            this.script = {
              meta: script.script,
              interaction: script.scenes.map(({ sceneID, text, type }) => ({ sceneID, text, type, answer: undefined })),
            }
            this.call.callCenterID = this.script.meta.callCenterID
          } else {
            this.script = false
          }
        })
    },

    /**
     * onInboundCall initializes the call object
     * @param {Object} connection The connection ref. provided by underlying library
     * @param {Boolean} isInbound Determines the direction of the call
     */
    onInboundCall (connection, isInbound) {
      this.call.kind = callKinds.inbound
      this.call.state = callStates.pending
      this.call.connection = connection
      this.call.from = connection.parameters.From
      this.call.to = connection.parameters.To
      this.call.callSid = connection.parameters.CallSid

      this.enrichCall(this.call.from)
    },

    /**
     * onResetState resets the component's state and prepares it for the next call
     */
    onResetState () {
      this.call = {
        kind: undefined,
        state: callStates.inactive,
        connection: undefined,
        reservation: undefined,
        from: undefined,
        to: undefined,
        callCenterID: undefined,
        startedAt: undefined,
        callSid: undefined,

        label: undefined,
        description: undefined,
        details: undefined,
      }
      this.script = undefined
      this.callInfo = undefined
      this.phoneNumber = undefined
    },

    /**
     * onAnswer instructs the call to be answered
     */
    onAnswer () {
      this.callManager.answerCall()
    },

    /**
     * onDecline instructs the call to be declined
     */
    onDecline () {
      this.callManager.declineCall()
        .then(() => {
          this.onResetState()
        })
    },

    /**
     * onHangup instructs the call to be hanged up
     */
    onHangup () {
      this.callManager.hangupCall()
    },

    /**
     * onDialpad handles user's interaction with the dialpad
     * @param {String} e The selected element on the dialpad
     */
    onDialpad (e) {
      if (this.call.state !== callStates.inProgress) {
        return
      }
      this.callManager.sendSig(e)
    },

    /**
     * onCall method initializes an outbound call to the dialed number
     */
    onCall () {
      if (!this.phoneNumber) {
        return
      }

      const standardize = s => s.replace(/[().\- ]/g, '')

      this.callManager.call({
        From: standardize(this.state.callerID),
        // remove user formatting
        To: standardize(this.phoneNumber),
      })
    },

    /**
     * onScriptComplete completes and saves the script that was created during the call
     */
    onScriptComplete () {
      this.call.state = callStates.ended
      this.apiClient.logCall(this.call, this.ns, this.script)
        .catch(err => this.stdErr(err))
        .finally(() => {
          this.onResetState()
        })
    },

    /**
     * onScriptDiscard discards the script that was created during the call
     */
    onScriptDiscard () {
      this.apiClient.logCall(this.call, this.ns)
        .catch(err => this.stdErr(err))
        .finally(() => {
          this.onResetState()
        })
    },

    /**
     * stdErr is a standard error handler that resets the state and logs the error
     * @param {Error} err The error to handle
     */
    stdErr (err) {
      this.onResetState()
      this.stdErrLog(err)
    },

    /**
     * stdErrLog is a standard error loger
     * @param {Error} err The error object to log
     */
    stdErrLog (err) {
      this.errors.push(err)
    },
  },
}
</script>
