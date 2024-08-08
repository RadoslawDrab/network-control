<script setup lang="ts">
import { ref } from 'vue';
import useToken from 'composables/useToken';
import { PhNetwork } from '@phosphor-icons/vue';

export type NavItem = {
  id: string;
  html: string;
  passwordRequired?: boolean;
  callback?: (id: string) => void;
};

const props = withDefaults(
  defineProps<{
    navItems: NavItem[];
    callback?: (id: string) => void;
  }>(),
  { callback: () => {} }
);

const token = useToken();
const showLoginModal = ref<boolean>(false);
const isValidLogin = ref<boolean>(false);

function itemCallback(item: NavItem) {
  if (item.passwordRequired && token.isLoggedIn) (item.callback && item.callback(item.id)) ?? props.callback(item.id);
  else if (!item.passwordRequired) (item.callback && item.callback(item.id)) ?? props.callback(item.id);
}
</script>
<template>
  <header class="py-2 mb-3 d-flex align-items-center justify-content-between border-bottom border-secondary-subtle">
    <h1 class="fs-5 d-flex align-items-center gap-2 m-0">
      <PhNetwork size="1.2em" />
      Network Controller
    </h1>
    <BNav pills>
      <BNavItem
        v-for="item in props.navItems.filter((item) => !item.passwordRequired || token.isLoggedIn)"
        :key="item.id"
        @click="() => itemCallback(item)"
        link-class="d-flex gap-2 align-items-center">
        <span v-html="item.html"></span>
      </BNavItem>
      <BNavItem class="vertical-line" v-if="!token.isLoggedIn" @click="() => (showLoginModal = true)">
        Zaloguj się
      </BNavItem>
      <BNavItem class="vertical-line" v-else @click="token.logout"> Wyloguj się </BNavItem>
    </BNav>
  </header>
  <LoginModal v-model:show="showLoginModal" v-model="isValidLogin" />
</template>
<style scoped lang="scss">
.vertical-line {
  border-left: 1px solid var(--bs-secondary-bg);
}
</style>
