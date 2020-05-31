<template>
  <v-navigation-drawer v-model="drawer" permanent color="teal" expand-on-hover fixed dark app>
    <v-list nav shaped rounded>
      <v-list-item to="/catalog/ru/">
        <v-list-item-avatar>
          <v-img :src="require('../assets/bit-box.png')" class="my-3" contain height="200"></v-img>
        </v-list-item-avatar>
      </v-list-item>

      <v-divider></v-divider>

      <v-list-item v-for="item in items" :key="item.title" link :to="item.route">
        <v-list-item-avatar>
          <v-icon>{{ item.icon }}</v-icon>
        </v-list-item-avatar>

        <v-list-item-content>
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-group v-for="item in groupedItems" :key="item.title" :prepend-icon="item.icon" no-action>
        <template v-slot:activator>
          <v-list-item-content>
            <v-list-item-title v-text="item.title"></v-list-item-title>
          </v-list-item-content>
        </template>

        <v-list-item v-for="subItem in item.items" :key="subItem.title" link :to="subItem.route">
          <v-list-item-content>
            <v-list-item-title v-html="subItem.title"></v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list-group>
    </v-list>
  </v-navigation-drawer>
</template>

<script>
export default {
  data: () => ({
    drawer: true,
    items: [
      { title: "Отзывы", icon: "mdi-comment-outline", route: "/reviews" },
      { title: "Настройки", icon: "mdi-settings-outline", route: "/settings" },
      { title: "Скидки", icon: "mdi-sale", route: "/sale" }
    ],
    groupedItems: [
      {
        title: "Каталог",
        icon: "mdi-cart-outline",
        items: [
          {
            title: "Русский",
            route: "/catalog/ru/"
          },
          {
            title: "Узбекский",
            route: "/catalog/uz/"
          }
        ]
      },
      {
        title: "Рассылки",
        icon: "mdi-text-subject",
        items: [
          {
            title: "Русский",
            route: "/posts/ru/"
          },
          {
            title: "Узбекский",
            route: "/posts/uz/"
          }
        ]
      },
      {
        title: "Текста",
        icon: "mdi-text-shadow",
        items: [
          {
            title: "Русский",
            route: "/locales/ru/"
          },
          {
            title: "Узбекский",
            route: "/locales/uz/"
          }
        ]
      }
    ]
  })
};
</script>
