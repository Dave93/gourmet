<template>
  <div>
    <h3 class="display-2 mb-4">Рассылки</h3>
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
              <v-btn
                icon
                v-on="on"
                :disabled="disableSend"
                :loading="isPostSending"
                @click="sendPost"
              >
                <v-icon color="teal">mdi-send</v-icon>
              </v-btn>
            </template>
            <span>Отправить пользователям</span>
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
        <ag-grid-vue
          style="width: 80vw; height: 80vh;"
          class="ag-theme-material"
          @selection-changed="postSelectionChanged"
          @grid-ready="onPostGridReady"
          :columnDefs="columnDefs"
          :rowData="rowData"
          rowSelection="single"
        ></ag-grid-vue>
      </div>
    </div>
    <v-dialog v-model="postEdit" persistent max-width="600px">
      <v-card>
        <v-card-title>
          <span class="headline">Добавление поста</span>
        </v-card-title>
        <v-card-text>
          <v-container grid-list-md>
            <v-layout wrap>
              <v-flex xs12>
                <v-text-field
                  label="Название на русском*"
                  :rules="[() => $v.post.name.required || 'Поле обязательно для заполнения']"
                  v-model.trim="$v.post.name.$model"
                  required
                ></v-text-field>
              </v-flex>
              <v-flex xs12>
                <v-file-input
                  ref="postPhoto"
                  @change="addPostPhoto"
                  label="Изображение"
                  filled
                  prepend-icon="mdi-camera"
                ></v-file-input>
              </v-flex>
              <v-flex xs12>
                <trix-vue
                  ref="text"
                  v-model="$v.post.text.$model"
                  placeholder="Описание на русском"
                ></trix-vue>
              </v-flex>
              <v-flex xs12>
                <v-text-field
                  label="Название на узбекском"
                  :rules="[() => $v.post.name_uz.required || 'Поле обязательно для заполнения']"
                  v-model.trim="$v.post.name_uz.$model"
                  required
                ></v-text-field>
              </v-flex>
              <v-flex xs12>
                <trix-vue
                  ref="text_uz"
                  v-model="$v.post.text_uz.$model"
                  placeholder="Описание на узбекском"
                ></trix-vue>
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
        <v-card-title class="headline">Вы действительно хотите удалить пост?</v-card-title>
        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn color="green darken-1" text @click="postDelete = false">Нет</v-btn>

          <v-btn color="red darken-1" text @click="deletePost">Да</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-snackbar v-model="snackbar" color="error" :timeout="6000" top>
      {{ errorText }}
      <v-btn dark text @click="snackbar = false">Закрыть</v-btn>
    </v-snackbar>
  </div>
</template>

<script>
import { AgGridVue } from "ag-grid-vue";
import TrixVue from "@dymantic/vue-trix-editor";
import axios from "axios";
import { required, minLength, between } from "vuelidate/lib/validators";
export default {
  name: "Posts",
  data: () => ({
    columnDefs: null,
    rowData: null,
    snackbar: false,
    isPostSending: false,
    isPostSaving: false,
    postEdit: false,
    postDelete: false,
    disableSend: true,
    currentLang: "ru",
    errorText: "",
    postPhoto: "",
    post: {
      name: "",
      name_uz: "",
      text: "",
      text_uz: "",
      sent_date: ""
    }
  }),
  validations: {
    post: {
      name: {
        required,
        minLength: minLength(3)
      },
      name_uz: {
        minLength: minLength(3)
      },
      text: {
        required,
        minLength: minLength(3)
      },
      text_uz: {
        minLength: minLength(3)
      }
    }
  },
  components: {
    AgGridVue,
    TrixVue
  },
  methods: {
    submitPost: async function() {
      this.$v.$touch();
      if (!this.$v.post.$invalid) {
        this.isPostSaving = true;
        let formData = new FormData();
        formData.append("photo", this.postPhoto);

        Object.keys(this.post).forEach(key => {
          formData.append(key, this.post[key]);
        });
        if (this.post.id) {
          const postAddResponse = await axios.put(
            "/api/posts/" + this.post.id + "/",
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data"
              }
            }
          );
        } else {
          const postAddResponse = await axios.post("/api/posts/", formData, {
            headers: {
              "Content-Type": "multipart/form-data"
            }
          });
        }
        const postResponse = await axios.get("/api/posts/");
        this.rowData = postResponse.data;
        this.isPostSaving = false;
        this.$nextTick(() => {
          this.$v.$reset();
        });
        this.post = {
          name: "",
          name_uz: "",
          text: "",
          text_uz: "",
          sent_date: ""
        };
        if (this.$refs.text) {
          this.$refs.text.editor.element.innerHTML = "";
        }
        if (this.$refs.text_uz) {
          this.$refs.text_uz.editor.element.innerHTML = "";
        }
        this.postEdit = false;
      }
    },
    deletePost: async function() {
      if (this.post.id) {
        const postAddResponse = await axios.delete(
          "/api/posts/" + this.post.id + "/"
        );
        const postResponse = await axios.get("/api/posts/");
        this.rowData = postResponse.data;
        this.post.id = "";
        this.postDelete = false;
      }
    },
    showAddPost() {
      this.postGridApi.deselectAll();
      if (this.$refs.text) {
        this.$refs.text.editor.element.innerHTML = "";
      }
      if (this.$refs.text_uz) {
        this.$refs.text_uz.editor.element.innerHTML = "";
      }
      this.post = {
        name: "",
        name_uz: "",
        text: "",
        text_uz: "",
        sent_date: ""
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
        this.post.name = selectedRows[0].name;
        this.post.name_uz = selectedRows[0].name_uz;
        this.post.text = selectedRows[0].text;
        this.post.text_uz = selectedRows[0].text_uz;
        this.post.sent_date = selectedRows[0].sent_date;
        this.postEdit = true;
      } else {
        this.errorText = "Необходимо выбрать пост";
        this.snackbar = true;
      }
    },
    sendPost: async function() {
      const selectedRows = this.postGridApi.getSelectedRows();
      if (selectedRows.length) {
        this.isPostSending = true;
        const postAddResponse = await axios.post(
          "/api/sendPost/",
          selectedRows[0]
        );
        const response = await axios.get("/api/posts/");
        this.rowData = response.data;
        this.isPostSending = false;
      } else {
        this.errorText = "Необходимо выбрать пост";
        this.snackbar = true;
      }
    },
    onPostGridReady(params) {
      this.postGridApi = params.api;
    },
    postSelectionChanged: async function() {
      const selectedRows = this.postGridApi.getSelectedRows();
      if (selectedRows.length) {
        if (selectedRows[0].sent_date) {
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
  beforeMount: async function() {
    this.currentLang = this.$route.params.lang;
    this.columnDefs = [
      {
        headerName: "Заголовок",
        field: this.currentLang == "uz" ? "name_uz" : "name",
        sortable: true,
        filter: true,
        suppressSizeToFit: true,
        resizable: true
      },
      {
        headerName: "Текст",
        field: this.currentLang == "uz" ? "text_uz" : "text",
        sortable: true,
        filter: true,
        suppressSizeToFit: true,
        resizable: true,
        cellRenderer: function(params) {
          return params.value ? params.value : "";
        }
      },
      {
        headerName: "Дата отправки",
        field: "sent_date",
        sortable: true,
        filter: true,
        suppressSizeToFit: true,
        resizable: true,
        cellRenderer: function(params) {
          if (params.value) {
            let davr = new Date(params.value);
            return davr.toLocaleString("ru");
          }
          return "";
        }
      }
    ];

    const response = await axios.get("/api/posts/");
    this.rowData = response.data;
  }
};
</script>
