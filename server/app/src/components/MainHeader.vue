<script setup lang="ts" generic="T extends string">
import { ref } from 'vue';
import useToken from 'composables/useToken';
import { PhNetwork, PhSignIn, PhSignOut } from '@phosphor-icons/vue';

export type NavItem<Id = string> = {
  id: Id;
  text?: string;
  html?: string;
  passwordRequired?: boolean;
  callback?: (id: string) => void;
};

const props = withDefaults(
  defineProps<{
    navItems: NavItem<T>[];
    callback?: (id: string) => void;
  }>(),
  { callback: () => {} }
);

const token = useToken();
const showLoginModal = ref<boolean>(false);
const isValidLogin = ref<boolean>(false);

function itemCallback(item: NavItem<T>) {
  if (item.passwordRequired && token.isLoggedIn) {
    item.callback && item.callback(item.id);
  } else if (!item.passwordRequired) {
    item.callback && item.callback(item.id);
  }
  props.callback(item.id);
}
</script>
<template>
  <header class="py-2 mb-3 d-flex align-items-center justify-content-between border-bottom border-secondary-subtle">
    <h1 class="fs-5 d-flex align-items-center gap-2 m-0">
      <PhNetwork size="1.2em" />
      Network Controller
    </h1>
    <BNav pills class="nav">
      <BNavItem
        v-for="item in props.navItems.filter((item) => !item.passwordRequired || token.isLoggedIn)"
        :key="item.id"
        @click="() => itemCallback(item)"
        link-class="d-flex gap-2 align-items-center">
        <span v-if="item.html" v-html="item.html"></span>
        <span v-else class="d-flex gap-2 align-items-center">
          <slot :="item"></slot>
          {{ item.text ?? item.id }}
        </span>
      </BNavItem>
      <BNavItem class="vertical-line" link-class="link" v-if="!token.isLoggedIn" @click="() => (showLoginModal = true)">
        <div class="link">
          <PhSignIn class="icon" />
          <span> Zaloguj się </span>
        </div>
      </BNavItem>
      <BNavItem class="vertical-line" link-class="link" v-else @click="token.logout">
        <div class="link">
          <PhSignOut class="icon" />
          <span> Wyloguj się </span>
        </div>
      </BNavItem>
    </BNav>
  </header>
  <PasswordModal v-model:show="showLoginModal" v-model="isValidLogin" />
</template>
<style scoped lang="scss">
.nav {
  --bs-nav-link-color: var(--bs-body-color);
  --bs-nav-link-hover-color: var(--bs-primary);
  .link {
    display: flex;
    align-items: center;
    gap: 0.5em;
  }
  .vertical-line {
    border-left: 1px solid var(--bs-secondary-bg);
  }
}
</style>
