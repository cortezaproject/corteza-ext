<template>
  <b-row>
    <b-col
      cols="12"
    >
      <h5>
        {{ script.meta.name }}
      </h5>
    </b-col>

    <!-- Script management section -->
    <b-col
      cols="12"
    >
      <b-form-group
        v-for="s of script.interaction"
        :key="s.text"
        label-cols="12"
        label-cols-sm="4"
        label-cols-lg="2"
        :label="s.text"
      >
        <b-form-textarea
          v-if="s.type !== 'dialogue'"
          v-model="s.answer"
          rows="3"
          max-rows="6"
        />
      </b-form-group>
    </b-col>
  </b-row>
</template>

<script>
/**
 * This component provides the interface to manage call scripts.
 * It handles display and editing of the given script.
 */
export default {
  props: {
    /**
     * An array of questions for the given script.
     */
    script: {
      type: Object,
      required: true,
      default: () => ({}),
    },
  },
}
</script>
