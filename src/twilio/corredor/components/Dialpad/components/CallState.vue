<template>
  <b-row>
    <!-- Call information section -->
    <b-col
      cols="12"
      class="text-center"
    >
      <h4 class="mb-1">
        {{ stateLabel }}: {{ call.label }}
      </h4>
      <h6
        v-if="call.description"
        class="mb-1"
      >
        {{ call.description }}
      </h6>

      <!-- Call timer -->
      <template v-if="call.state === callStates.inProgress">
        <h6 class="timer">
          <pre>{{ callDuration.h }}:{{ callDuration.m }}:{{ callDuration.s }}</pre>
        </h6>
      </template>
    </b-col>

    <!-- Call state management; answer, hangup, ... -->
    <b-col
      cols="12"
      class="text-center mt-2"
    >
      <b-button-group size="sm">
        <template v-if="call.state === callStates.pending">
          <b-button
            variant="success"
            @click="$emit('answer')"
          >
            <slot name="call.answer.content" />
          </b-button>
          <b-button
            variant="danger"
            @click="$emit('decline')"
          >
            <slot name="call.decline.content" />
          </b-button>
        </template>
        <template v-if="call.state === callStates.inProgress">
          <b-button
            variant="danger"
            @click="$emit('hangup')"
          >
            <slot name="call.hangup.content" />
          </b-button>
        </template>
      </b-button-group>
    </b-col>
  </b-row>
</template>

<script>
import numeral from 'numeral'
import { callStates } from '../lib'

/**
 * This component provides the interface to manage the call.
 * It handles call information display (eg. who is calling) and call state management (eg. hangup, answer, ...)
 */
export default {

  props: {
    /**
     * An object representing the call's state.
     */
    call: {
      type: Object,
      required: true,
      default: () => ({}),
    },
  },
  data () {
    return {
      intervalHandle: undefined,
      callDuration: { h: 0, m: 0, s: 0 },
      callStates,
    }
  },

  computed: {
    /**
     * stateLabel generates a user friendly label for the given state
     * @returns {String}
     */
    stateLabel () {
      if (this.call.kind === 'inbound') {
        return 'Incoming call from#'
      } else {
        return 'Calling#'
      }
    },
  },

  watch: {
    'call.state': {
      handler: function (state) {
        if (state === callStates.inProgress) {
          // When answered, start the timer
          this.updateTime()
          this.intervalHandle = window.setInterval(this.updateTime, 1000)
        } else if (this.intervalHandle !== undefined) {
          // When call ends, stop the timer
          window.clearInterval(this.intervalHandle)
          this.intervalHandle = undefined
        }
      },
      immediate: true,
    },
  },

  methods: {
    /**
     * updateTime calculates the elapsed hours, minutes and seconds for the call
     * This method should be called periodically
     */
    updateTime () {
      // get total seconds between the times
      let delta = Math.abs(this.call.startedAt - new Date()) / 1000

      // calculate (and subtract) whole hours
      const hours = Math.floor(delta / 3600) % 24
      delta -= hours * 3600
      this.callDuration.h = numeral(hours).format('00')

      // calculate (and subtract) whole minutes
      const minutes = Math.floor(delta / 60) % 60
      delta -= minutes * 60
      this.callDuration.m = numeral(minutes).format('00')

      // what's left is seconds
      const seconds = delta % 60 // in theory the modulus is not required
      this.callDuration.s = numeral(seconds).format('00')
    },
  },
}
</script>
