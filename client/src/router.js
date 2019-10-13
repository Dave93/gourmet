import Vue from "vue";
import Router from "vue-router";
import Home from "./views/Home.vue";

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: "/",
      name: "home",
      component: () =>
          import(/* webpackChunkName: "about" */ "./views/Catalog.vue")
    },
    {
      path: "/about",
      name: "about",
      // route level code-splitting
      // this generates a separate chunk (about.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () =>
        import(/* webpackChunkName: "about" */ "./views/About.vue")
    },
    {
      path: "/reviews",
      name: "reviews",
      component: () =>
        import(/* webpackChunkName: "about" */ "./views/Reviews.vue")
    },
    {
      path: "/sale",
      name: "sale",
      component: () =>
        import(/* webpackChunkName: "about" */ "./views/Sale.vue")
    },
    {
      path: "/catalog/:lang/",
      name: "catalog",
      component: () =>
        import(/* webpackChunkName: "about" */ "./views/Catalog.vue")
      },
    {
      path: "/locales/:lang/",
      name: "locales",
      component: () =>
        import(/* webpackChunkName: "about" */ "./views/Locales.vue")
    },
    {
      path: "/posts/:lang/",
      name: "posts",
      component: () =>
        import(/* webpackChunkName: "about" */ "./views/Posts.vue")
    },
    {
      path: "/settings/",
      name: "settings",
      component: () =>
        import(/* webpackChunkName: "about" */ "./views/Settings.vue")
    }
  ]
});
