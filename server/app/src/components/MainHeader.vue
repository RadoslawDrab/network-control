<script setup lang="ts" generic="Id extends string, T = any">
import { ref } from 'vue';
import { PhList, PhMoon, PhNetwork, PhSignIn, PhSignOut, PhSun, PhTranslate } from '@phosphor-icons/vue';
import { BNavItemDropdown, useColorMode } from 'bootstrap-vue-next';

import useToken from 'composables/useToken';
import useHover from 'composables/useHover';

export type NavItem<Id = string, T = string> = {
  id: Id;
  text?: string;
  html?: string;
  value?: T;
  passwordRequired?: boolean;
  callback?: (value: T, id: Id) => void;
  type?: 'default' | 'language';
  active?: boolean;
};

const props = withDefaults(
  defineProps<{
    navItems: NavItem<Id, T>[];
    callback?: (id: Id) => void;
  }>(),
  { callback: () => {} }
);

const mode = useColorMode();

const token = useToken();
const showLoginModal = ref<boolean>(false);
const isValidLogin = ref<boolean>(false);

const languageDropdown = ref<HTMLElement>();
const defaultDropdown = ref<HTMLElement>();
const defaultDropdownHover = useHover(defaultDropdown);
const languageDropdownHover = useHover(languageDropdown);

function itemCallback(item: NavItem<Id, T>) {
  if (item.passwordRequired && token.isLoggedIn) {
    item.callback && item.callback(item.value, item.id);
  } else if (!item.passwordRequired) {
    item.callback && item.callback(item.value, item.id);
  }
  props.callback(item.id);
}
function changeColorMode() {
  mode.value = mode.value === 'dark' ? 'light' : 'dark';
}
function checkDefaultType(item: NavItem<Id, T>) {
  return item.type === undefined || item.type === 'default';
}
</script>
<template>
  <header class="py-2 mb-3 d-flex align-items-center justify-content-between border-bottom border-secondary-subtle">
    <h1 class="fs-5 d-flex align-items-center gap-2 m-0">
      <PhNetwork size="1.2em" />
      Network Controller
    </h1>
    <BNav pills class="nav">
      <BNavItemDropdown
        ref="defaultDropdown"
        v-if="props.navItems.some(checkDefaultType)"
        no-caret
        v-model="defaultDropdownHover">
        <template #button-content>
          <PhList size="1.5rem" />
        </template>
        <MainHeaderActionGroup
          :items="props.navItems.filter((item) => !item.passwordRequired && checkDefaultType(item))"
          :callback="itemCallback"
          :group-props="{ header: '##options.main##' }"
          v-slot="item">
          <slot :="item"></slot>
        </MainHeaderActionGroup>
        <BDropdownDivider v-if="token.isLoggedIn" />
        <MainHeaderActionGroup
          v-if="token.isLoggedIn"
          :items="props.navItems.filter((item) => item.passwordRequired && token.isLoggedIn && checkDefaultType(item))"
          :callback="itemCallback"
          :group-props="{ header: '##options.administration##' }"
          v-slot="item">
          <slot :="item"></slot>
        </MainHeaderActionGroup>
      </BNavItemDropdown>
      <BNavItem class="vertical-line" @click="changeColorMode">
        <PhSun v-if="mode === 'light'" size="1.5rem" aria-label-translate="mode.light" />
        <PhMoon v-else size="1.5rem" aria-label-translate="mode.dark" />
      </BNavItem>
      <BNavItemDropdown
        ref="languageDropdown"
        v-if="props.navItems.some((i) => i.type === 'language')"
        v-model="languageDropdownHover"
        no-caret>
        <template #button-content>
          <PhTranslate size="1.5rem" />
        </template>
        <MainHeaderActionGroup
          :items="props.navItems.filter((item) => item.type === 'language')"
          :callback="itemCallback"
          :group-props="{ header: '##language##' }"
          v-slot="item">
          <slot :="item"></slot>
        </MainHeaderActionGroup>
      </BNavItemDropdown>
      <BNavItem class="vertical-line" link-class="link" v-if="!token.isLoggedIn" @click="() => (showLoginModal = true)">
        <div class="link">
          <PhSignIn class="icon" />
          <span data-translate="user.log-in"> Log in </span>
        </div>
      </BNavItem>
      <BNavItem class="vertical-line" link-class="link" v-else @click="token.logout">
        <div class="link">
          <PhSignOut class="icon" />
          <span data-translate="user.log-out"> Log out </span>
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

  .vertical-line {
    border-left: 1px solid var(--bs-secondary-bg);
  }
}
</style>
