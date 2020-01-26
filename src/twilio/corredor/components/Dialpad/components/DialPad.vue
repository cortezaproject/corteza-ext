<template>
  <b-row>
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
            @click="$emit('input', el)"
          >
            <h3>
              <code class="text-dark">{{ el }}</code>
            </h3>
          </b-btn>
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
  data () {
    return {
      // Just a simple dialpad grid definition
      grid: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        ['*', 0, '#'],
      ],
    }
  },
}
</script>
