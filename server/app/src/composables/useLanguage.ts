import { computed, onMounted, ref, watch } from 'vue';

import languageFile from 'public/language.json';

const useLanguage = <Id extends string = string>() => {
  const storageKey = `${document.location.origin}/language`;
  const options = ref<TranslationOptions<Id>>({
    languages: ['en', 'pl'],
    template: '##TEMPLATE##',
    fallbackText: 'NOT_FOUND',
    attributeName: 'translate',
    attributes: ['aria-label'],
    ...(languageFile as Partial<TranslationOptions<Id>>),
  });
  const language = ref<Language>((sessionStorage.getItem(storageKey) as Language) ?? getBrowserLanguage());
  const attributeName = computed(() => options.value.attributeName ?? 'translate');
  const languageIndex = computed(() => options.value.languages.findIndex((l) => language.value === l));
  const template = computed(() => {
    const opt = {
      prefix: options.value.template.match(/.*(?=TEMPLATE)/).at(0) || '##',
      suffix: options.value.template.match(/(?<=TEMPLATE).*/).at(0) || '##',
    };
    return {
      ...opt,
      checkRegEx: new RegExp(`${options.value.template.replace('TEMPLATE', '.{1,}')}`, 'g'),
      prefixRegEx: new RegExp(`^${opt.prefix}`),
      suffixRegEx: new RegExp(`${opt.suffix}$`),
    };
  });

  watch(
    language,
    (lang) => {
      document.documentElement.lang = lang;

      sessionStorage.setItem(storageKey, lang);
    },
    { immediate: true }
  );

  onMounted(() => {
    const mutationObserver = new MutationObserver((mutations) => {
      for (let mutation of mutations) {
        const target = mutation.target as HTMLElement;
        translateNodes(target);
      }
    });

    mutationObserver.observe(document.documentElement, { attributeFilter: ['lang'] });
    mutationObserver.observe(document.body, { subtree: true, attributes: true });

    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        translateNodes([...mutation.addedNodes] as HTMLElement[]);
      }
    }).observe(document.body, { childList: true, subtree: true });

    function translateNodes(target: HTMLElement | HTMLElement[]) {
      const targets = Array.isArray(target) ? target : [target];

      for (const target of targets) {
        const textNodes = getNodes(target, Node.TEXT_NODE)
          .filter((n) => n.textContent && n.textContent.match(template.value.checkRegEx))
          .map((el) => {
            el.parentElement.dataset[attributeName.value] = getTemplateId(el.textContent);
            return el.parentElement;
          });
        translateElements(...getNodes(target), ...textNodes);
      }
      function getNodes<T extends Node>(node: T, nodeType?: number, nodes: T[] = []): T[] {
        // @ts-ignore
        const children = node.childNodes as T[];
        nodes.push(...children);
        for (const child of children) {
          getNodes(child, nodeType, nodes);
        }
        return nodes.filter((n) => (nodeType ? n.nodeType === nodeType : true));
      }
      function translateElements(...elements: HTMLElement[]) {
        const filteredDataset = elements.filter((el) => {
          if (el.dataset || el.querySelector) {
            return (
              el.dataset[attributeName.value] ||
              el.querySelector(`[data-${attributeName.value}]`) ||
              options.value.attributes.some((attr) => el.querySelector(`[${attr}-${attributeName.value}]`))
            );
          }
          return false;
        });
        for (let el of filteredDataset) {
          if (el.dataset[attributeName.value]) {
            translate(el);
          }
          const childElements = el.querySelectorAll<HTMLElement>(`[data-${attributeName.value}]`);

          childElements.forEach((el) => translate(el));

          options.value.attributes.forEach((attr) => {
            const attribute = `${attr}-${attributeName.value}`;
            const attributeElements = el.querySelectorAll<HTMLElement>(`[${attribute}]`);

            attributeElements.forEach((el) => {
              translate(el, {
                name: attr,
                value: el.getAttribute(attribute),
              });
            });
          });
        }
      }
    }
    function translate(el: HTMLElement, attribute?: { name: string; value: string }) {
      const ids = attribute ? getTemplateIds(attribute.value, false) : [el.dataset.translate];

      for (const id of ids) {
        const item: string[] | null = options.value.labels[getTemplateIds(id, true)[0]] ?? null;

        if (item && item[languageIndex.value]) {
          const value = item[languageIndex.value];

          if (attribute) el.setAttribute(attribute.name, attribute.value.replace(id, value));
          else el.textContent = value;

          return;
        }

        if (el.textContent === '' || el.textContent.match(template.value.checkRegEx)) {
          el.textContent = options.value.fallbackText;
        }
      }
    }
  });

  function getBrowserLanguage(): Language {
    const language = navigator.language.split('-')[0];
    return options.value.languages.find((l) => l === language) ?? 'en';
  }
  function isCurrentLanguage(lang: Language) {
    return language.value === lang;
  }
  function translate(id: Id): string | null {
    if (options.value.labels) {
      // @ts-ignore
      const values: string[] | null = options.value.labels[id];
      if (values && values.length > 0) {
        return values[languageIndex.value];
      }
    }
    return null;
  }
  function setLanguage(lang: Language) {
    language.value = lang;
  }
  function getTemplateId(str: string) {
    const templateMatch = str.match(template.value.checkRegEx) ?? [str];

    return templateMatch.reduce(
      (newStr, s) =>
        newStr.replace(s, s.replace(template.value.prefixRegEx, '').replace(template.value.suffixRegEx, '')),
      str
    );
  }
  function getTemplateIds(str: string, replace: boolean = false): string[] {
    const templateMatch = str.match(template.value.checkRegEx) ?? [str];

    return templateMatch.map((id) =>
      replace ? id.replace(template.value.prefixRegEx, '').replace(template.value.suffixRegEx, '') : id
    );
  }
  return { translate, setLanguage, languages: options.value.languages, isCurrentLanguage, language };
};
export default useLanguage;

type Language = 'en' | 'pl';
type TranslateTemplate = `${string}TEMPLATE${string}`;

interface TranslationOptions<Id extends string> {
  languages: Language[];
  template: TranslateTemplate;
  fallbackText: string;
  labels?: Record<Id, string[]>;
  attributeName?: string;
  attributes: string[];
}
