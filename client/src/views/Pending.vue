<template>
  <div>
    <Heading :heading="heading" />

    <Alert v-if="isError" :error="error" />

    <template v-else>
      <ProgressCircular v-if="isLoading"></ProgressCircular>

      <template v-else>
        <v-layout align-center justify-center>
          <p>Pending transactions which are still waiting to be confirmed (in mempool)</p>
        </v-layout>

        <v-layout row wrap>
          <v-flex d-flex xs12 md8 offset-md2>
            <v-card class="break-all">
              <template v-for="(txid, index) in txids">
                <v-card-title class="justify-center" :key="txid">
                  <v-tooltip top open-delay="0" close-delay="0">
                    <template v-slot:activator="{ on }">
                      <div v-on="on">
                        <v-icon small class="mr-2">fas fa-money-check</v-icon>
                        <router-link
                          class="monospace primary--text"
                          :to="{ name: 'tx', params: { txid }}"
                        >{{ txid }}</router-link>
                      </div>
                    </template>
                    <span>Transaction Id (txid)</span>
                  </v-tooltip>
                </v-card-title>
                <v-divider v-if="index != txids.length - 1" :key="txid"></v-divider>
              </template>
            </v-card>
          </v-flex>
        </v-layout>
      </template>
    </template>
  </div>
</template>

<script>
import Heading from "../components/Heading.vue";
import ProgressCircular from "../components/ProgressCircular.vue";
import Alert from "../components/Alert.vue";

export default {
  components: {
    Heading,
    ProgressCircular,
    Alert
  },
  data: () => ({
    heading: {
      title: "Pending",
      icon: "far fa-hourglass",
      append: ""
    },
    txids: [],
    error: "There was an error.",
    isError: false,
    isLoading: true
  }),
  async created() {
    try {
      this.txids = await this.getPending();

      this.heading.append = `(${this.txids.length})`;

      this.isLoading = false;
    } catch (error) {
      this.isError = true;
    } finally {
      this.isLoading = false;
    }
  },
  methods: {
    async getPending() {
      const {
        data: { data: pending }
      } = await this.$http.get("/api/pending");

      return pending;
    }
  }
};
</script>

