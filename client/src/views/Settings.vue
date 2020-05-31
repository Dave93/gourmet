<template>
  <div>
    <h3 class="display-2 mb-4">Настройки</h3>
    <v-container grid-list-md>
      <v-layout wrap>
        <v-flex xs6 style="width: 60vw">
          <v-card>
            <v-card-text>
              <v-container grid-list-md>
                <v-layout wrap>
                  <v-flex xs12>
                    <trix-vue name="address" v-model.trim="$v.settings.address.$model" placeholder="Адресс на русском*"></trix-vue>
                  </v-flex>
                  <v-flex xs12>
                    <trix-vue name="address_uz" v-model.trim="$v.settings.address_uz.$model" placeholder="Адресс на узбекском*"></trix-vue>
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
import TrixVue from "@dymantic/vue-trix-editor";
export default {
  name: "Settings",
  data: () => ({
    settings: {
      address: "",
      address_uz: ""
    },
    snackbar: false,
    successText: ""
  }),
  components: {
    TrixVue
  },
  validations: {
    settings: {
      address: {
        required,
        minLength: minLength(3)
      },
      address_uz: {
        required,
        minLength: minLength(3)
      }
    }
  },
  beforeMount: async function() {
    const response = await axios.get(`http://localhost:5456/api/settings/`);
    setTimeout(() => {
      this.settings = response.data;
    }, 500);    
  },
  methods: {
    saveLocales: async function() {
      this.$v.$touch();
      if (!this.$v.settings.$invalid) {
        const sectionAddResponse = await axios.post(
          `/api/settings/`,
          this.settings
        );
        this.successText = "Изменения успешно сохранены";
        this.snackbar = true;
      }
    }
  }
};
</script>
