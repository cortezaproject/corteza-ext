<template>
  <b-row>
    <b-col
      cols="12"
      sm="6"
    >
      <!-- Handle worker activity -->
      <b-form-group :label="workerStatusLabel">
        <b-form-select
          :input="value.activity"
          :options="activities"
          @input="updateActivity"
        />
      </b-form-group>
    </b-col>

    <!-- This section handles caller ID selection -->
    <b-col
      cols="12"
      sm="6"
    >
      <b-form-group :label="callerIDsLabel">
        <b-form-select
          :input="value.callerID"
          :options="callerIDs"
          @input="updateCallerID"
        />
      </b-form-group>
    </b-col>
  </b-row>
</template>

<script>
/**
 * Component provides state configuration; such as worker activity, caller ID, ...
 */
export default {
  props: {
    /**
     * A state object for the component
     */
    value: {
      type: Object,
      required: true,
      default: () => ({}),
    },
    /**
     * Available activities to chose from
     */
    activities: {
      type: Array,
      required: true,
      default: () => [],
    },
    /**
     * Available caller IDs to chose from
     */
    callerIDs: {
      type: Array,
      required: true,
      default: () => [],
    },

    workerStatusLabel: {
      type: String,
      required: true,
    },
    callerIDsLabel: {
      type: String,
      required: true,
    },
  },

  methods: {
    /**
     * updateActivity binds the model directive to update the state's activity
     * @param {String} activity The activity to update to
     */
    updateActivity (activity) {
      this.$emit('input', { ...this.value, activity })
    },

    /**
     * updateCallerID binds the model directive to update the state's callerID
     * @param {String} callerID The callerID to update to
     */
    updateCallerID (callerID) {
      this.$emit('input', { ...this.value, callerID })
    },
  },
}
</script>
