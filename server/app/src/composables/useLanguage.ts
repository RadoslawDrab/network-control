import { computed, onMounted, ref, watch } from 'vue';

import languageFile from 'public/language.json';

const useLanguage = <Id extends string = keyof typeof languageFile.labels>() => {
  const storageKey = `${document.location.origin}/language`;
  const options = ref<Required<TranslationOptions<Id>>>({
    languages: ['en', 'pl'],
    template: '##TEMPLATE##',
    fallbackText: 'NOT_FOUND',
    attributeName: 'translate',
    attributes: ['aria-label'],
    labels: null,
    ...(languageFile as Partial<TranslationOptions<Id>>),
  });
  type TemplateId = TranslateTemplate<Id>;

  const language = ref<Language>((sessionStorage.getItem(storageKey) as Language) ?? getBrowserLanguage());

  const attributeName = computed(() => options.value.attributeName);
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
            el.parentElement.dataset[attributeName.value] = el.textContent;
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
        // All elements which include translation data attribute or custom attribute
        const filteredElements = elements.filter((el) => {
          if (el.dataset || el.querySelector) {
            return (
              el.dataset[attributeName.value] ||
              el.querySelector(`[data-${attributeName.value}]`) ||
              options.value.attributes.some((attr) => el.querySelector(`[${attr}-${attributeName.value}]`))
            );
          }
          return false;
        });

        for (let el of filteredElements) {
          // Translates current element
          if (el.dataset[attributeName.value]) {
            translateElement(el);
          }

          const childElements = el.querySelectorAll<HTMLElement>(`[data-${attributeName.value}]`);

          // Translates all child elements
          childElements.forEach((el) => translateElement(el));

          options.value.attributes.forEach((attr) => {
            const attribute = `${attr}-${attributeName.value}`;
            const attributeElements = [...el.querySelectorAll<HTMLElement>(`[${attribute}]`)];

            if (el.getAttribute(attribute)) attributeElements.push(el);

            // Translates all custom in childs attributes
            attributeElements.forEach((el) => {
              translateElement(el, {
                name: attr,
                value: el.getAttribute(attribute),
              });
            });
          });
        }
      }
    }
    function translateElement(el: HTMLElement, attribute?: { name: string; value: string }) {
      const isId = !attribute && Object.keys(options.value.labels).includes(el.dataset.translate);

      if (isId) {
        t(el.dataset.translate);
        return;
      }

      t(attribute ? attribute.value : el.dataset.translate);

      function t(text: string) {
        const value = isId ? translate(text as Id) : translateText(text);

        if (value) {
          // Sets attribute
          if (attribute) el.setAttribute(attribute.name, attribute.value.replace(text, value));
          // Sets text content
          else el.textContent = value;

          return;
        }

        // Replaces text content if no translation is found
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
  function translate(id: Id | TemplateId): string | null {
    if (options.value.labels) {
      const templateIds = getTemplateIds(id);
      const newId = templateIds.length > 0 ? templateIds[0] : id;

      // Gets translation values based on `id`
      // @ts-ignore
      const values: string[] | null =
        options.value.labels[newId.replace(template.value.prefixRegEx, '').replace(template.value.suffixRegEx, '')];
      if (values && values.length > 0) {
        // Returns translation
        return values[languageIndex.value];
      }
    }
    return null;
  }
  function translateText(text: string): string {
    if (options.value.labels) {
      const templateIds = getTemplateIds(text);

      if (templateIds.length === 0) {
        return translate(text as Id);
      }
      return templateIds.reduce((value, id) => value.replace(id, translate(id)), text);
    }
    return text;
  }
  function setLanguage(lang: Language) {
    language.value = lang;
  }
  function getTemplateIds(str: string): TemplateId[] {
    return (str.match(template.value.checkRegEx) ?? []) as TemplateId[];
  }
  return { translate, setLanguage, languages: options.value.languages, isCurrentLanguage, language };
};
export default useLanguage;

export type Language = 'en' | 'pl';
type TranslateTemplate<T extends string = 'TEMPLATE'> = `${string}${T}${string}`;

interface TranslationOptions<Id extends string = string> {
  /** Languages in order in which they are added in `language.json` */
  languages: Language[];
  /** Template for string text. Must include `TEMPLATE` keyword
   * @default "##TEMPLATE##"
   */
  template: TranslateTemplate;
  /** Fallback text when no translation is found and there is no initial text
   * @default "NOT_FOUND"
   */
  fallbackText: string;
  /**
   * Labels with translations. Each label has to be in order which is specified in `languages` property
   * @example
   * ```
   * languages: ['en', 'pl']
   * labels: {
   *   time: ["Time", "Czas"]
   * }
   * Where `time` is id
   * ```
   */
  labels: Record<Id, string[]> | null;
  /** Attribute to search for.
   * @default translate
   */
  attributeName?: string;
  /** Attributes which will be checked.
   * @example
   * ```
   * attributes: ["aria-label"]
   * ```
   * Will check any aria-label attribute
   */
  attributes: string[];
}
