<script setup lang="ts" generic="T extends string">
import { ref } from 'vue';
import useToken from 'composables/useToken';
import { PhList, PhMoon, PhNetwork, PhSignIn, PhSignOut, PhSun } from '@phosphor-icons/vue';
import { useColorMode } from 'bootstrap-vue-next';

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

const mode = useColorMode();

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
function changeColorMode() {
  mode.value = mode.value === 'dark' ? 'light' : 'dark';
}
</script>
<template>
  <header class="py-2 mb-3 d-flex align-items-center justify-content-between border-bottom border-secondary-subtle">
    <h1 class="fs-5 d-flex align-items-center gap-2 m-0">
      <PhNetwork size="1.2em" />
      Network Controller
    </h1>
    <BNav pills class="nav">
      <BNavItemDropdown no-caret>
        <template #button-content>
          <PhList size="1.5rem" />
        </template>
        <MainHeaderActionGroup
          :items="props.navItems.filter((item) => !item.passwordRequired)"
          :callback="itemCallback"
          :group-props="{ header: 'Główne' }"
          v-slot="item">
          <slot :="item"></slot>
        </MainHeaderActionGroup>
        <BDropdownDivider v-if="token.isLoggedIn" />
        <MainHeaderActionGroup
          v-if="token.isLoggedIn"
          :items="props.navItems.filter((item) => item.passwordRequired && token.isLoggedIn)"
          :callback="itemCallback"
          :group-props="{ header: 'Administracja' }"
          v-slot="item">
          <slot :="item"></slot>
        </MainHeaderActionGroup>
      </BNavItemDropdown>
      <BNavItem class="vertical-line" @click="changeColorMode">
        <PhSun v-if="mode === 'light'" size="1.5rem" />
        <PhMoon v-else size="1.5rem" />
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
  align-items: center;
  .link {
    display: flex;
    align-items: center;
    gap: 0.5em;
    line-height: 1.2;
  }
  // .nav-link {
  //   // padding: 0;
  //   --bs-nav-link-padding-x: 0rem !important;
  //   --bs-nav-link-padding-y: 0rem !important;
  //   // --bs-btn-padding-x: 0rem;
  //   // --bs-btn-padding-y: 0rem;

  //   display: flex;
  //   align-items: center;
  //   .icon {
  //     margin: 0.25em;
  //   }
  // }
  .vertical-line {
    border-left: 1px solid var(--bs-secondary-bg);
  }
}
</style>
