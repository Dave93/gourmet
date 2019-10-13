<template>
  <v-app>
    <Drawer />

    <!-- Sizes your content based upon application components -->
    <v-content>

      <!-- Provides the application the proper gutter -->
      <div class="fill-height" style="margin-left: 30px;">
        <v-layout>
          <!-- If using vue-router -->
          <router-view :key="$route.path"></router-view>
        </v-layout>
      </div>
    </v-content>

    <v-footer app>
      <!-- -->
    </v-footer>
  </v-app>
</template>

<style lang="css" scoped>
@import "~ag-grid-community/dist/styles/ag-grid.css";
@import "~ag-grid-community/dist/styles/ag-theme-material.css";
</style>
<style lang="scss">
  trix-toolbar .trix-button-group.trix-button-group--block-tools {
      display: none;
  }
</style>


<script>
import Drawer from "./components/Drawer.vue";

export default {
  name: "App",
  components: {
    Drawer
  },
  data: () => ({
    //
  })
};
</script>
