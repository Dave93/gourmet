<template>
  <div>
    <h3 class="display-2 mb-4">Reviews</h3>
    <div class="mylist">
      <div class="content-area content-area--mylist">
        <ag-grid-vue style="width: 80vw; height: 80vh;" class="ag-theme-material" :columnDefs="columnDefs" :rowData="rowData" rowSelection="single">
        </ag-grid-vue>
      </div>
    </div>
  </div>
</template>

<script>
import { AgGridVue } from "ag-grid-vue";
import axios from "axios";
export default {
  data: () => ({
    columnDefs: null,
    rowData: null
  }),
  components: {
    AgGridVue
  },
  methods: {},
  beforeMount: async function () {
    this.columnDefs = [
      {
        headerName: "Review Text",
        field: "review_text",
        sortable: true,
        filter: true
      },
      { headerName: "Point", field: "point", sortable: true, filter: true }
    ];

    const response = await axios.get("/api/reviews/");
    this.rowData = response.data;
  }
};
</script>
