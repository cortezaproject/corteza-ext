<template>
  <b-row>
    <!-- Script management section -->
    <b-col
      cols="12"
    >
      <b-form-group
        v-for="q of script"
        :key="q.label"
        label-cols="12"
        label-cols-sm="4"
        label-cols-lg="2"
        :label="q.label"
      >
        <b-form-textarea
          v-model="q.answer"
          rows="3"
          max-rows="6"
        />
      </b-form-group>
    </b-col>

    <!-- Script actions section -->
    <b-col
      cols="12"
      class="text-right"
    >
      <b-btn-group size="sm">
        <b-btn
          variant="success"
          @click="$emit('complete')"
        >
          <slot name="script.complete.content" />
        </b-btn>
        <b-btn
          variant="danger"
          @click="$emit('discard')"
        >
          <slot name="script.discard.content" />
        </b-btn>
      </b-btn-group>
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
      type: Array,
      required: true,
      default: () => [],
    },
  },
}
</script>
