<template>
  <b-row>
    <b-col
      class="mb-2"
      cols="12"
    >
      <b-input-group>
        <!-- backspace icon -->
        <template #append>
          <b-btn
            class="d-flex"
            @mousedown.prevent.stop
            @click="deleteItem"
          >
            <div class="arrow" />
            <div class="content">
              x
            </div>
          </b-btn>
        </template>
        <b-form-input
          ref="phoneNumber"
          placeholder="Phone number#"
          type="tel"
          :value="value"
          @input="$emit('input', $event)"
        />
      </b-input-group>
    </b-col>
    <b-col
      class="mx-auto"
      cols="6"
    >
      <b-row
        v-for="(row, i) in grid"
        :key="i"
        size="sm"
      >
        <b-col
          v-for="el in row"
          :key="el"
          class="p-0"
        >
          <b-btn
            class="w-100"
            variant="light"
            squared
            @mousedown.prevent.stop
            @click.prevent.stop="enterItem(el)"
          >
            <h3>
              <code class="text-dark">{{ el }}</code>
            </h3>
          </b-btn>
        </b-col>
      </b-row>

      <b-row>
        <b-col
          class="text-center mt-2"
          cols="12"
        >
          <slot name="dialPad.actionRow" />
        </b-col>
      </b-row>
    </b-col>
  </b-row>
</template>

<script>
/**
 * This component provides an interface for the user to enter a phone number or send DTMF signals.
 */
export default {
  props: {
    value: {
      type: String,
      required: false,
      default: '',
    },
  },

  data () {
    return {
      // Just a simple dialpad grid definition
      grid: [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['*', '0', '#'],
      ],
    }
  },

  methods: {
    /**
     * enterItem handles user's click on the dialpad
     * @param {String} e The pressed button's value
     */
    enterItem (e) {
      const selection = this.$refs.phoneNumber.selectionStart
      const ns = this.value.substring(0, selection) + e + this.value.substring(selection)
      this.$emit('input', ns)
      this.$emit('dial-pad', e)

      // Reset caret position
      setTimeout(() => {
        this.$refs.phoneNumber.setSelectionRange(selection + 1, selection + 1)
      }, 0)
    },

    /**
     * deleteItem handles user's click on the backspace button and simulates the
     * backspace key press.
     */
    deleteItem () {
      const selection = this.$refs.phoneNumber.selectionStart
      const ns = this.value.substring(0, selection - 1) + this.value.substring(selection)
      this.$emit('input', ns)

      // Reset caret position
      setTimeout(() => {
        const adjS = Math.max(selection - 1, 0)
        this.$refs.phoneNumber.setSelectionRange(adjS, adjS)
      }, 0)
    },
  },
}
</script>

<style lang="scss" scoped>
.arrow {
  width: 0;
  height: 0;
  border-top: 10px solid transparent;
  border-right: 10px solid #fafafa;
  border-bottom: 10px solid transparent;
}
.content {
  width: 20px;
  height: 20px;
  background-color: #fafafa;
  color: #1e1e1e;
  line-height: 20px;
  font-weight: bold;
  font-size: 12px;
}
</style>
