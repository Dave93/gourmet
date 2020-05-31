<template>
  <div>
    <h3 class="display-2 mb-4">Каталог</h3>
    <v-container grid-list-md>
      <v-layout wrap>
        <v-flex xs4 style="width: 25vw">
          <div class="mylist">
            <div class="content-area content-area--mylist">
              <v-toolbar dense elevation="1" style="width: 25vw;" class="mb-2">
                <v-toolbar-title>Категории</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-btn icon @click="showAddSection">
                  <v-icon color="teal">mdi-plus-circle</v-icon>
                </v-btn>
                <v-btn icon @click="showEditSection">
                  <v-icon color="teal">mdi-square-edit-outline</v-icon>
                </v-btn>
                <v-btn icon @click="showDeleteSection">
                  <v-icon color="teal">mdi-delete</v-icon>
                </v-btn>
              </v-toolbar>
              <ag-grid-vue style="width: 25vw; height: 80vh;" @selection-changed="sectionSelectionChanged" @grid-ready="onSectionGridReady" class="ag-theme-material" resizable :columnDefs="sectionColumnDefs" :rowData="sectionRowData" rowSelection="single">
              </ag-grid-vue>
            </div>
          </div>
        </v-flex>
        <v-flex xs7>
          <div class="mylist">
            <div class="content-area content-area--mylist">
              <v-toolbar dense elevation="1" style="width: 55vw;" class="mb-2 ml-4">
                <v-toolbar-title>Товары</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-btn icon @click="showProductAdd">
                  <v-icon color="teal">mdi-plus-circle</v-icon>
                </v-btn>
                <v-btn icon @click="showEditProduct">
                  <v-icon color="teal">mdi-square-edit-outline</v-icon>
                </v-btn>
                <v-btn icon @click="showDeleteProduct">
                  <v-icon color="teal">mdi-delete</v-icon>
                </v-btn>
              </v-toolbar>
              <ag-grid-vue style="width: 55vw; height: 80vh;" @selection-changed="productSelectionChanged" class="ag-theme-material ml-4" @grid-ready="onProductGridReady" :columnDefs="productColumnDefs" :rowData="productRowData" rowSelection="single">
              </ag-grid-vue>
            </div>
          </div>
        </v-flex>
      </v-layout>
    </v-container>
    <v-dialog v-model="sectionEdit" persistent max-width="600px">
      <v-card>
        <v-card-title>
          <span class="headline">Добавление категории</span>
        </v-card-title>
        <v-card-text>
          <v-container grid-list-md>
            <v-layout wrap>
              <v-flex xs12>
                <v-file-input ref="sectionPhoto" @change="addSectionPhoto" label="Изображение" filled prepend-icon="mdi-camera"></v-file-input>
              </v-flex>
              <v-flex xs12>
                <v-text-field ref="sec_desc" label="Название на русском*" :rules="[() => $v.section.name.required || 'Поле обязательно для заполнения']" v-model.trim="$v.section.name.$model" required></v-text-field>
              </v-flex>
              <v-flex xs12>
                <trix-vue v-model.trim="$v.section.description.$model" placeholder="Описание на русском"></trix-vue>
              </v-flex>
              <v-flex xs12>
                <v-text-field ref="sec_desc_uz" label="Название на узбекском*" :rules="[() => $v.section.name_uz.required || 'Поле обязательно для заполнения']" v-model.trim="$v.section.name_uz.$model" required></v-text-field>
              </v-flex>
              <v-flex xs12>
                <trix-vue v-model.trim="$v.section.description_uz.$model" placeholder="Описание на узбекском"></trix-vue>
              </v-flex>
            </v-layout>
          </v-container>
          <small>*Являются обязательными полями</small>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="sectionEdit = false">Закрыть</v-btn>
          <v-btn color="blue darken-1" :loading="isSectionSaving" text @click="submitSection">Сохранить</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="sectionDelete" max-width="290">
      <v-card>
        <v-card-title class="headline">Вы действительно хотите удалить категорию?</v-card-title>
        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn color="green darken-1" text @click="sectionDelete = false">
            Нет
          </v-btn>

          <v-btn color="red darken-1" text @click="deleteSection">
            Да
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="productDelete" max-width="290">
      <v-card>
        <v-card-title class="headline">Вы действительно хотите удалить товар?</v-card-title>
        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn color="green darken-1" text @click="productDelete = false">
            Нет
          </v-btn>

          <v-btn color="red darken-1" text @click="deleteProduct">
            Да
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="productEdit" persistent max-width="600px">
      <v-card>
        <v-card-title>
          <span class="headline">Добавление товара</span>
        </v-card-title>
        <v-card-text>
          <v-container grid-list-md>
            <v-layout wrap>
              <v-flex xs12>
                <v-file-input ref="productPhoto" @change="addProductPhoto" label="Изображение" filled prepend-icon="mdi-camera"></v-file-input>
              </v-flex>
              <v-flex xs12>
                <v-text-field outlined label="Название на русском*" :rules="[() => $v.product.name.required || 'Поле обязательно для заполнения']" v-model.trim="$v.product.name.$model" required></v-text-field>
              </v-flex>
              <v-flex xs12>
                <trix-vue ref="produc_desc" v-model.trim="$v.product.description.$model" placeholder="Описание на русском"></trix-vue>
              </v-flex>
              <v-flex xs12>
                <v-text-field outlined label="Название на узбекском*" :rules="[() => $v.product.name_uz.required || 'Поле обязательно для заполнения']" v-model.trim="$v.product.name_uz.$model" required></v-text-field>
              </v-flex>
              <v-flex xs12>
                <trix-vue ref="produc_desc_uz" v-model.trim="$v.product.description_uz.$model" placeholder="Описание на узбекском"></trix-vue>
              </v-flex>
              <v-flex xs12>
                <v-text-field outlined type="number" label="Цена*" :rules="[() => $v.product.price.required || 'Поле обязательно для заполнения']" v-model.trim="$v.product.price.$model" required></v-text-field>
              </v-flex>
            </v-layout>
          </v-container>
          <small>*Являются обязательными полями</small>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="productEdit = false">Закрыть</v-btn>
          <v-btn color="blue darken-1" :loading="isProductSaving" text @click="submitProduct">Сохранить</v-btn>
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
import TrixVue from "@dymantic/vue-trix-editor";
import axios from "axios";
import { required, minLength, between } from "vuelidate/lib/validators";
import Fancy from "../components/Fancy.vue";

export default {
  name: "Catalog",
  data: () => ({
    snackbar: false,
    productEdit: false,
    productDelete: false,
    isProductSaving: false,
    sectionEdit: false,
    sectionDelete: false,
    sectionColumnDefs: null,
    sectionRowData: null,
    isSectionSaving: false,
    productColumnDefs: null,
    productRowData: null,
    currentLang: "ru",
    sectionPhoto: "",
    productPhoto: "",
    section: {
      name: "",
      name_uz: "",
      description: "",
      description_uz: "",
      id: "",
      file: ""
    },
    product: {
      name: "",
      name_uz: "",
      id: "",
      price: 0,
      description: "",
      description_uz: "",
      file: ""
    },
    errorText: ""
  }),
  validations: {
    section: {
      name: {
        required,
        minLength: minLength(3)
      },
      name_uz: {
        required,
        minLength: minLength(3)
      },
      description: {},
      description_uz: {}
    },
    product: {
      name: {
        required,
        minLength: minLength(3)
      },
      name_uz: {
        required,
        minLength: minLength(3)
      },
      price: {
        required,
        minLength: minLength(3)
      },
      description: {},
      description_uz: {}
    }
  },
  components: {
    AgGridVue,
    TrixVue
  },
  methods: {
    submitSection: async function () {
      this.$v.$touch();
      if (!this.$v.section.$invalid) {
        let formData = new FormData();
        if(this.sectionPhoto) {
            formData.append('photo', this.sectionPhoto);
        }
        Object.keys(this.section).forEach((key) => {
          formData.append(key, this.section[key]);
        });
        this.isSectionSaving = true;
        if (this.section.id) {
          const sectionAddResponse = await axios.put(
            "/api/catalog_section/" +
              this.section.id +
              "/",
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
          );
        } else {
          const sectionAddResponse = await axios.post(
            "/api/catalog_section/",
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
          );
        }
        const sectionResponse = await axios.get(
          "/api/catalog_section/"
        );
        this.sectionRowData = sectionResponse.data;
        this.isSectionSaving = false;
        this.section = {
          file: "",
          name: "",
          name_uz: "",
          description: "",
          description_uz: ""
        };
        this.$nextTick(() => {
          this.$v.$reset();
        });
        this.sectionEdit = false;
      }
    },
    submitProduct: async function () {
      this.$v.$touch();
      if (!this.$v.product.$invalid) {
        let formData = new FormData();
        console.log(this.productPhoto);
        if(this.productPhoto) {
            formData.append('photo', this.productPhoto);
        }
        Object.keys(this.product).forEach((key) => {
          formData.append(key, this.product[key]);
        });
        formData.append('section_id', this.section.id);
        this.isProductSaving = true;
        if (this.product.id) {
          const sectionAddResponse = await axios.put(
            "/api/products/" + this.product.id + "/",
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
          );
        } else {
          const sectionAddResponse = await axios.post(
            "/api/products/",
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
          );
        }

        const sectionResponse = await axios.get(
          "/api/products/",
          {
            params: {
              section_id: this.section.id
            }
          }
        );
        this.productRowData = sectionResponse.data;
        this.isProductSaving = false;
        this.product = {
          name: "",
          name_uz: "",
          price: 0,
          id: "",
          description: "",
          description_uz: "",
          file: ""
        };
        this.$nextTick(() => {
          this.$v.product.$reset();
        });
        this.productEdit = false;
      }
    },
    deleteSection: async function () {
      if (this.section.id) {
        const sectionAddResponse = await axios.delete(
          "/api/catalog_section/" + this.section.id + "/"
        );
        const sectionResponse = await axios.get(
          "/api/catalog_section/"
        );
        this.sectionRowData = sectionResponse.data;
        this.section.id = "";
        this.sectionDelete = false;
      }
    },
    deleteProduct: async function () {
      if (this.section.id) {
        const sectionAddResponse = await axios.delete(
          "/api/products/" + this.product.id + "/"
        );
        const sectionResponse = await axios.get(
          "/api/products/",
          {
            params: {
              section_id: this.section.id
            }
          }
        );
        this.productRowData = sectionResponse.data;
        this.product.id = "";
        this.productDelete = false;
      }
    },
    showAddSection() {
      this.sectionGridApi.deselectAll();
      this.section = {
          file: "",
          name: "",
          name_uz: "",
          description: "",
          description_uz: ""
      };
      if(this.$refs.sec_desc) {
          this.$refs.sec_desc.editor.loadHTML(' ');
          this.$refs.sec_desc_uz.editor.loadHTML(' ');
      }
      if(this.$refs.sectionPhoto)
      {
          this.$refs.sectionPhoto.file.value = null;
      }
      this.sectionEdit = true;
    },
    showDeleteSection() {
      const selectedRows = this.sectionGridApi.getSelectedRows();
      if (selectedRows.length) {
        this.section.id = selectedRows[0].id;
        this.sectionDelete = true;
      } else {
        this.errorText = "Необходимо выбрать категорию";
        this.snackbar = true;
      }
    },
    showDeleteProduct() {
      const selectedRows = this.productGridApi.getSelectedRows();
      if (selectedRows.length) {
        this.product.id = selectedRows[0].id;
        this.productDelete = true;
      } else {
        this.errorText = "Необходимо выбрать товар";
        this.snackbar = true;
      }
    },
    showEditSection() {
      const selectedRows = this.sectionGridApi.getSelectedRows();
      if (selectedRows.length) {
        this.section.id = selectedRows[0].id;
        this.section.name = selectedRows[0].name;
        this.section.file = selectedRows[0].file;
        this.section.name_uz = selectedRows[0].name_uz;
        this.section.description_uz = selectedRows[0].description_uz;
        this.section.description = selectedRows[0].description;
        if(this.$refs.sec_desc) {
          this.$refs.sec_desc.editor.loadHTML(selectedRows[0].description);
          this.$refs.sec_desc_uz.editor.loadHTML(selectedRows[0].description_uz);
        }
        this.sectionEdit = true;
      } else {
        if(this.$refs.sec_desc) {
          this.$refs.sec_desc.editor.loadHTML(' ');
          this.$refs.sec_desc_uz.editor.loadHTML(' ');
        }
        this.errorText = "Необходимо выбрать категорию";
        this.snackbar = true;
      }
    },
    showEditProduct() {
      if(this.$refs.productPhoto)
      {
          this.productPhoto = null;
          this.$refs.productPhoto.value = null;
          this.$refs.productPhoto = {};
      }
      const selectedRows = this.productGridApi.getSelectedRows();
      if (selectedRows.length) {
        this.product.id = selectedRows[0].id;
        this.product.name = selectedRows[0].name;
        this.product.name_uz = selectedRows[0].name_uz;
        this.product.file = selectedRows[0].file;
        this.product.price = selectedRows[0].price;
        this.product.description_uz = selectedRows[0].description_uz;
        this.product.description = selectedRows[0].description;
        this.productEdit = true;
          this.$refs.produc_desc.editor.loadHTML(selectedRows[0].description);
          this.$refs.produc_desc_uz.editor.loadHTML(selectedRows[0].description_uz);
      } else {
        this.$refs.produc_desc.editor.loadHTML(' ');
        this.$refs.produc_desc_uz.editor.loadHTML(' ');
        this.errorText = "Необходимо выбрать товар";
        this.snackbar = true;
      }
    },
    onSectionGridReady(params) {
      this.sectionGridApi = params.api;
    },
    onProductGridReady(params) {
      this.productGridApi = params.api;
    },
    sectionSelectionChanged: async function () {
      const selectedRows = this.sectionGridApi.getSelectedRows();
      if (selectedRows.length) {
        this.section.id = selectedRows[0].id;
        const productResponse = await axios.get(
          "/api/products/",
          {
            params: {
              section_id: this.section.id
            }
          }
        );
        this.productRowData = productResponse.data;
      } else {
        this.section.id = "";
      }
    },
    productSelectionChanged: async function () {
      const selectedRows = this.productGridApi.getSelectedRows();
      if (selectedRows.length) {
        this.product.id = selectedRows[0].id;
      } else {
        this.product.id = "";
      }
    },
    showProductAdd() {
      this.productGridApi.deselectAll();
      const selectedRows = this.sectionGridApi.getSelectedRows();
      this.product = {
          name: "",
          name_uz: "",
          price: 0,
          id: "",
          description: "",
          description_uz: "",
          file: ""
      };
      if(this.$refs.produc_desc) {
          this.$refs.produc_desc.editor.loadHTML(' ');
          this.$refs.produc_desc_uz.editor.loadHTML(' ');
      }

      if(this.$refs.productPhoto)
      {
          this.productPhoto = null;
          this.$refs.productPhoto.value = null;
          this.$refs.productPhoto = {};
      }
      if (selectedRows.length) {
        this.productEdit = true;
      } else {
        this.errorText = "Необходимо выбрать категорию";
        this.snackbar = true;
      }
    },
    addSectionPhoto(files) {
      this.sectionPhoto = files;
    },
    addProductPhoto(files) {
      this.productPhoto = files;
    }
  },
  beforeMount: async function () {
      if(!this.$route.params.lang) {
        this.currentLang = 'ru';
      } else {
        this.currentLang = this.$route.params.lang;
      }
    this.sectionColumnDefs = [
      {
        headerName: "Название",
        field: this.currentLang == "uz" ? "name_uz" : "name",
        suppressSizeToFit: true,
        resizable: true
      }
    ];

    const sectionResponse = await axios.get(
      "/api/catalog_section/"
    );
    this.sectionRowData = sectionResponse.data;
    this.productColumnDefs = [
      {
        headerName: "Название",
        field: this.currentLang == "uz" ? "name_uz" : "name",
        suppressSizeToFit: true,
        resizable: true
      },
      {
        headerName: "Фото",
        field: "file",
        suppressSizeToFit: true,
        resizable: true,
        cellRendererFramework: Fancy
      },
      {
        headerName: "Цена",
        field: "price",
        suppressSizeToFit: true,
        resizable: true
      }
    ];

    this.productRowData = [];
  }
};
</script>
