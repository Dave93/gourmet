<template>
  <div>
    <h3 class="display-2 mb-4">Скидки</h3>
    <div class="mylist">
      <div class="content-area content-area--mylist">
        <v-toolbar dense elevation="1" style="width: 80vw;" class="mb-2">
          <v-tooltip bottom>
            <template v-slot:activator="{ on }">
              <v-btn icon v-on="on" @click="showAddPost">
                <v-icon color="teal">mdi-plus-circle</v-icon>
              </v-btn>
            </template>
            <span>Добавить</span>
          </v-tooltip>
          <v-tooltip bottom>
            <template v-slot:activator="{ on }">
              <v-btn icon v-on="on" @click="showEditPost">
                <v-icon color="teal">mdi-square-edit-outline</v-icon>
              </v-btn>
            </template>
            <span>Редактировать</span>
          </v-tooltip>
          <v-tooltip bottom>
            <template v-slot:activator="{ on }">
              <v-btn icon v-on="on" @click="showDeletePost">
                <v-icon color="teal">mdi-delete</v-icon>
              </v-btn>
            </template>
            <span>Удалить</span>
          </v-tooltip>
        </v-toolbar>
        <ag-grid-vue style="width: 80vw; height: 80vh;" class="ag-theme-material" @selection-changed="postSelectionChanged" @grid-ready="onPostGridReady" :columnDefs="columnDefs" :rowData="rowData" rowSelection="single">
        </ag-grid-vue>
      </div>
    </div>
    <v-dialog v-model="postEdit" persistent max-width="600px">
      <v-card>
        <v-card-title>
          <span class="headline">Добавление скидки</span>
        </v-card-title>
        <v-card-text>
          <v-container grid-list-md>
            <v-layout wrap>
              <v-flex xs12>
                <v-text-field label="Предел суммы*" :rules="[() => $v.post.order_price.required || 'Поле обязательно для заполнения']" v-model.trim="$v.post.order_price.$model" required></v-text-field>
              </v-flex>
              <v-flex xs12>
                <v-text-field label="Скидка" :rules="[() => $v.post.discount.required || 'Поле обязательно для заполнения']" v-model.trim="$v.post.discount.$model" required></v-text-field>
              </v-flex>
            </v-layout>
          </v-container>
          <small>*Являются обязательными полями</small>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="postEdit = false">Закрыть</v-btn>
          <v-btn color="blue darken-1" :loading="isPostSaving" text @click="submitPost">Сохранить</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="postDelete" max-width="290">
      <v-card>
        <v-card-title class="headline">Вы действительно хотите удалить скидку?</v-card-title>
        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn color="green darken-1" text @click="postDelete = false">
            Нет
          </v-btn>

          <v-btn color="red darken-1" text @click="deletePost">
            Да
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-snackbar v-model="snackbar" color="error" :timeout=6000 top>
      {{ errorText }}
      <v-btn dark text @click="snackbar = false">
        Закрыть
      </v-btn>
    </v-snackbar>
  </div>
</template>

<script>
import { AgGridVue } from "ag-grid-vue";
import axios from "axios";
import { required, minLength, between } from "vuelidate/lib/validators";
export default {
  data: () => ({
    columnDefs: null,
    rowData: null,
    snackbar: false,
    isPostSending: false,
    isPostSaving: false,
    postEdit: false,
    postDelete: false,
    currentLang: "ru",
    errorText: "",
    postPhoto: "",
    post: {
      order_price: "",
      discount: ""
    }
  }),
  validations: {
    post: {
      order_price: {
        required,
        minLength: minLength(2)
      },
      discount: {
        required
      }
    }
  },
  components: {
    AgGridVue
  },
  
  methods: {
    submitPost: async function () {
      this.$v.$touch();
      if (!this.$v.post.$invalid) {
        this.isPostSaving = true;
        let formData = new FormData();
        Object.keys(this.post).forEach((key) => {
          formData.append(key, this.post[key]);
        });
        if (this.post.id) {
          const postAddResponse = await axios.put(
            "/api/discounts/" +
              this.post.id +
              "/",
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
          );
        } else {
          const postAddResponse = await axios.post(
            "/api/discounts/",
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
          );
        }
        const postResponse = await axios.get(
          "/api/discounts/"
        );
        this.rowData = postResponse.data;
        this.isPostSaving = false;
        this.$nextTick(() => {
          this.$v.$reset();
        });
        this.post = {
          order_price: "",
          discount: ""
        };
        if(this.$refs.text) {
          this.$refs.text.editor.element.innerHTML = '';
        }
        if(this.$refs.text_uz) {
          this.$refs.text_uz.editor.element.innerHTML = '';
        }
        this.postEdit = false;
      }
    },
    deletePost: async function () {
      if (this.post.id) {
        const postAddResponse = await axios.delete(
          "/api/discounts/" + this.post.id + "/"
        );
        const postResponse = await axios.get(
          "/api/discounts/"
        );
        this.rowData = postResponse.data;
        this.post.id = "";
        this.postDelete = false;
      }
    },
    showAddPost() {
      this.postGridApi.deselectAll();
      if(this.$refs.text) {
        this.$refs.text.editor.element.innerHTML = '';
      }
      if(this.$refs.text_uz) {
        this.$refs.text_uz.editor.element.innerHTML = '';
      }
      this.post = {
        order_price: "",
        discount: ""
      };
      setTimeout(() => {
        this.postEdit = true;
      });
    },
    showDeletePost() {
      const selectedRows = this.postGridApi.getSelectedRows();
      if (selectedRows.length) {
        this.post.id = selectedRows[0].id;
        this.postDelete = true;
      } else {
        this.errorText = "Необходимо выбрать пост";
        this.snackbar = true;
      }
    },
    showEditPost() {
      const selectedRows = this.postGridApi.getSelectedRows();
      if (selectedRows.length) {
        this.post.id = selectedRows[0].id;
        this.post.order_price = selectedRows[0].order_price;
        this.post.discount = selectedRows[0].discount;
        this.postEdit = true;
      } else {
        this.errorText = "Необходимо выбрать скидку";
        this.snackbar = true;
      }
    },
    sendPost: async function () {
      const selectedRows = this.postGridApi.getSelectedRows();
      if (selectedRows.length) {
        this.isPostSending = true;
        const response = await axios.get("/api/discounts/");
        this.rowData = response.data;
        this.isPostSending = false;

      } else {
        this.errorText = "Необходимо выбрать скидку";
        this.snackbar = true;
      }
    },
    onPostGridReady(params) {
      this.postGridApi = params.api;
    },
    postSelectionChanged: async function () {
      const selectedRows = this.postGridApi.getSelectedRows();
      if (selectedRows.length) {
        if(selectedRows[0].sent_date) {
          this.disableSend = true;
        } else {
          this.disableSend = false;
        }
      } else {
        this.disableSend = true;
      }
    },
    addPostPhoto(files) {
      this.postPhoto = files;
    }
  },
  beforeMount: async function () {
    this.columnDefs = [
      {
        headerName: "Предел суммы",
        field: "order_price",
        sortable: true,
        filter: true
      },
      { headerName: "Скидка", field: "discount", sortable: true, filter: true }
    ];

    const response = await axios.get("/api/discounts/");
    this.rowData = response.data;
  }
};
</script>
