<template>
  <!-- @todo remove || true! -->
  <b-container v-if="componentInitialized || true">
    <pre>
      {{ state }}
    </pre>
    <!-- Component's state configuration -->
    <state-config
      v-model="state"
      :activities="activities"
      :caller-i-ds="callerIDs"
      worker-status-label="Worker statuses"
      caller-i-ds-label="Caller IDs"
      class="mb-3"
    />

    <!-- Call state management and display -->
    <call-state
      v-if="call"
      :call="call"
      @anwser="onAnwser"
      @decline="onDecline"
      @hangup="onHangup"
    >
      <template #call.answer.content>
        Answer
      </template>
      <template #call.decline.content>
        Decline
      </template>
      <template #call.hangup.content>
        Hangup
      </template>
    </call-state>

    <!-- Dialpad for calling external numbers and sending DTMF signals -->
    <dial-pad
      class="my-3"
      @input="onDialpad"
    />

    <!-- Agent's call script management; display and editing -->
    <call-script
      v-if="script"
      :script="script"
      @complete="onScriptComplete"
      @discard="onScriptDiscard"
    >
      <template #script.complete.content>
        Save the script
      </template>
      <template #script.discard.content>
        Discard
      </template>
    </call-script>
    <b-row v-else>
      <b-col cols="12">
        <p class="text-center">
          Script loading#
        </p>
      </b-col>
    </b-row>

    <error-log
      :errors="errors"
    />
  </b-container>
  <b-container v-else>
    <b-row>
      <b-col cols="12">
        <h4>
          Loading#...
        </h4>
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
import {
  Twilio,
  Corteza,
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

  data () {
    return {
      /**
       * Component management paramaters
       */
      state: { activity: undefined, callerID: undefined, deviceReady: false, workerReady: false },
      activities: [],
      callerIDs: [],
      callManager: undefined,
      cortezaManager: undefined,

      /**
       * Call state management paramaters
       */
      call: {
        kind: undefined,
        state: callStates.inactive,
        label: undefined,
        details: undefined,
        connection: undefined,
        startedAt: undefined,
        callCenterID: undefined,
      },

      errors: undefined,
      script: undefined,
    }
  },

  computed: {
    /**
     * componentInitialized determines if the component is initialized and ready to go
     * @returns {Boolean}
     */
    componentInitialized () {
      return this.state.deviceReady && this.state.workersInitialized
    },
  },

  watch: {
    'state.activity': {
      handler: function (activity) {
        this.callManager.syncWorkerActivities(activity)
          .catch(err => this.stdErr(err))
      },
    },
    'state.callerID': {
      handler: function (callerID) {
        this.callManager.setCallerID(callerID)
          .catch(err => this.stdErr(err))
      },
    },
  },

  mounted () {
    this.$nextTick(() => {
      this.init()
    })
  },

  methods: {
    /**
     * init initializes callManager and cortezaManager objects
     */
    async init () {
      // Setup call manager and handle it's events
      this.callManager = await new Twilio(window.user).init()

      // * component initialization
      this.callManager.on(Twilio.events.deviceReady, this.onDeviceReady)
      this.callManager.on(Twilio.events.workersInitialized, this.onWorkersInitialized)

      // * activity management
      this.callManager.on(Twilio.events.workerActivityUpdate, this.onWorkerActivityUpdate)

      // * call management
      this.callManager.on(Twilio.events.callInboundPending, this.onInboundCall)
      this.callManager.on(Twilio.events.callInboundConnected, this.onCallStarted)
      this.callManager.on(Twilio.events.callInboundDisconnected, this.onCallEnded)
      this.callManager.on(Twilio.events.callInboundCanceled, this.onResetState)

      this.callManager.on(Twilio.events.callOutboundConnected, this.onCallStarted)
      this.callManager.on(Twilio.events.callOutboundDisconnected, this.onCallEnded)

      // * state
      this.callManager.on(Twilio.events.error, this.stdErr)

      // * misc
      this.activities = await this.callManager.allActivities()

      // Setup Corteza manager
      const user = window.user || {}
      this.cortezaManager = new Corteza(user.JWT)
    },

    /**
     * onDeviceReady updates the state and marks the device as ready
     */
    onDeviceReady () {
      this.state.deviceReady = true
    },

    /**
     * onWorkersInitialized updates the state and marks the workers as initialized
     */
    onWorkersInitialized () {
      this.state.workersInitialized = true
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
      this.cortezaManager.logCall(this.call)
      this.call.state = callStates.ended
    },

    /**
     * onCallStarted updates the call object after the call was anwsered
     * @param {Object} connection The connection ref. provided by underlying library
     */
    onCallStarted (connection) {
      this.call.state = callStates.inProgress
      this.call.connection = connection
      this.call.startedAt = new Date()
    },

    /**
     * onInboundCall initializes the call object
     * @param {Object} connection The connection ref. provided by underlying library
     * @param {Boolean} isInbound Determines the direction of the call
     */
    onInboundCall (connection, isInbound) {
      this.call.kind = isInbound ? callKinds.inbound : callKinds.outbound
      this.call.state = callStates.pending
      this.call.connection = connection

      // Get caller information
      this.cortezaManager.fetchCallerInfo(connection)
        .then(({ label, description, callCenterID }) => {
          this.call.label = label
          this.call.description = description
          this.call.callCenterID = callCenterID

          // Prepare the script for this caller
          return this.cortezaManager.fetchScript(callCenterID)
        })
        .then(script => {
          this.script = script
        })
    },

    /**
     * onResetState resets the component's state and prepares it for the next call
     */
    onResetState () {
      this.call = {
        kind: undefined,
        state: callStates.inactive,
        label: undefined,
        details: undefined,
        connection: undefined,
        startedAt: undefined,
        callCenterID: undefined,
      }
      this.script = undefined
      this.callManager.hangupCall()
      this.callManager.agentReady()
    },

    /**
     * onAnwser instructs the call to be answered
     */
    onAnwser () {
      this.callManager.answerCall()
    },

    /**
     * onDecline instructs the call to be declined
     */
    onDecline () {
      this.callManager.declineCall()
    },

    /**
     * onHangup instructs the call to be hanged up
     */
    onHangup () {
      this.callManager.hangupCall()
    },

    /**
     * onDialpad handles user's interaction with the dialpad
     * @todo implement if needed
     * @param {String} e The selected element on the dialpad
     */
    onDialpad (e) {
      console.debug('onDialpad')
    },

    /**
     * onScriptComplete completes and saves the script that was created during the call
     */
    onScriptComplete () {
      return this.cortezaManager.completeScript(this.call.callCenterID, this.script)
        .catch(err => this.stdErr(err))
        .finally(() => this.onResetState())
    },

    /**
     * onScriptDiscard discards the script that was created during the call
     */
    onScriptDiscard () {
      this.onResetState()
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
