import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import vuetify from './plugins/vuetify';
import 'ag-grid-enterprise';
import FlagIcon from 'vue-flag-icon'
import Vuelidate from 'vuelidate'
Vue.use(Vuelidate)
Vue.use(FlagIcon);
Vue.config.productionTip = false;

new Vue({
  router,
  store,
  vuetify,
  render: h => h(App)
}).$mount("#app");
