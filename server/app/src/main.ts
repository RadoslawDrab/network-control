import { createApp } from 'vue';
import { createBootstrap } from 'bootstrap-vue-next';

import App from './App.vue';

import 'bootstrap-vue-next/dist/bootstrap-vue-next.css';
import 'assets/index.scss';

const app = createApp(App);

app.use(createBootstrap());
app.mount('#root');
