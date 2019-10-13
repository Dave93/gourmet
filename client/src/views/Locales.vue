<template>
  <div>
    <h3 class="display-2 mb-4">Текста</h3>
    <v-container grid-list-md>
      <v-layout wrap>
        <v-flex xs6>
          <v-card>
            <v-card-title>
              <span class="headline">Редактирование текстов</span>
            </v-card-title>
            <v-card-text>
              <v-container grid-list-md>
                <v-layout wrap>
                  <v-flex xs12 :key="name" v-for="(value, name) in locales">
                    <v-text-field :label="labels[name] + '*'" :rules="[() => $v.locales[name].required || 'Поле обязательно для заполнения']" v-model.trim="$v.locales[name].$model" required></v-text-field>
                  </v-flex>
                </v-layout>
              </v-container>
              <small>*Являются обязательными полями</small>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="blue darken-1" @click="saveLocales" text>Сохранить</v-btn>
            </v-card-actions>
          </v-card>
        </v-flex>
      </v-layout>
    </v-container>
    <v-snackbar v-model="snackbar" color="success" :timeout=6000 top>
      {{ successText }}
      <v-btn dark text @click="snackbar = false">
        Закрыть
      </v-btn>
    </v-snackbar>
  </div>
</template>

<script>
import axios from "axios";
import { required, minLength, between } from "vuelidate/lib/validators";
export default {
  name: "Locales",
  data: () => ({
    locales: {},
    labels: {},
    snackbar: false,
    successText: ''
  }),
  validations: function () {
    let data = {
      locales: {}
    };
    const locales = this.locales;
    console.log(this.locales);
    Object.keys(locales).forEach((key) => {
      data.locales[key] = {
        required,
        minLength: minLength(3)
      };
    });
    return data;
  },
  beforeMount: async function () {
    this.currentLang = this.$route.params.lang;
    const response = await axios.get(
      `/api/${this.currentLang}.yaml/`
    );
    this.locales = response.data;
    Object.keys(this.locales).forEach((key) => {
      this.labels[key] = this.locales[key];
    });
  },
  methods: {
    saveLocales: async function() {
      this.$v.$touch();
      console.log(this.$v.locales.$invalid);
      if (!this.$v.locales.$invalid) {
        const sectionAddResponse = await axios.post(
          `/api/${this.currentLang}.yaml/`,
          this.locales
        );
        this.successText = 'Изменения успешно сохранены';
        this.snackbar = true;
      }
    }
  }
};
</script>
