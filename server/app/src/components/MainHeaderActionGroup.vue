<script setup lang="ts" generic="Id extends string, T = any">
import { BDropdownGroup } from 'bootstrap-vue-next';

import { NavItem } from './MainHeader.vue';

const props = defineProps<{
  items: NavItem<Id, T>[];
  callback: (item: NavItem<Id, T>) => void;
  groupProps?: InstanceType<typeof BDropdownGroup>['$props'];
}>();
</script>
<template>
  <BDropdownGroup :="props.groupProps">
    <BDropdownItemButton
      v-for="item in props.items"
      :key="item.id"
      @click="() => props.callback(item)"
      :active="item.active"
      link-class="d-flex gap-2 align-items-center">
      <span v-if="item.html" v-html="item.html"></span>
      <span v-else class="d-flex gap-2 align-items-center">
        <slot :="item"></slot>
        <span>
          {{ item.text ?? item.id }}
        </span>
      </span>
    </BDropdownItemButton>
  </BDropdownGroup>
</template>
