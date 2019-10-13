<template>
  <div>
    <img v-if="value" :src="value" style="height: 200px" />
  </div>
</template>

<script>
import Vue from "vue";
export default Vue.extend({
  name: "Fancy",
  data: () => ({
    value: ""
  }),
  methods: {
  },
  beforeMount: async function() {
      if(typeof this.params.getValue() == 'string')
        this.value = `${this.params.getValue()}`;
  }
});
</script>
