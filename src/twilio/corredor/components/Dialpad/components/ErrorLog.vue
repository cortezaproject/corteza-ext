<template>
  <b-row>
    <b-col
      cols="12"
    >
      <b-form-group
        label="Errors#"
      >
        <b-form-textarea
          v-model="errorLog"
          rows="3"
          max-rows="6"
          disabled
        />
      </b-form-group>
    </b-col>
  </b-row>
</template>

<script>
/**
 * This component handeles error log display.
 */
export default {
  props: {
    /**
     * An array of error objects
     */
    errors: {
      type: Array,
      required: false,
      default: () => [],
    },
  },
  computed: {
    /**
     * errorLog computes the log's content based on the provided errors
     * @returns {String}
     */
    errorLog () {
      if (!this.errors) {
        return ''
      }
      return this.errors.map(({ message }) => `Error: ${message}`).join('\n')
    },
  },
}
</script>
