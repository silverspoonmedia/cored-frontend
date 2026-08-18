<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Swiper from 'swiper/bundle'
import 'swiper/css/bundle'
import spriteUrl from '@/valkivid3/assets/img/sprite.svg'

export interface VkStr1HeroSpotlight {
  kicker?: string | null
  title: string
  url?: string | null
  cta?: string | null
  image_url?: string | null
}

const props = defineProps<{
  spotlight?: VkStr1HeroSpotlight | null
}>()

const { t } = useI18n()

const swiperEl = ref<HTMLElement | null>(null)
let swiper: Swiper | null = null

// Slide 2 = API-driven content spotlight; falls back to i18n slide copy.
const spotlight = computed<VkStr1HeroSpotlight>(() => {
  if (props.spotlight && props.spotlight.title) {
    return props.spotlight
  }
  return {
    kicker: t('web.vtual.public.hero.two.kicker'),
    title: t('web.vtual.public.hero.two.title_a') + ' ' + t('web.vtual.public.hero.two.title_b'),
    url: null,
    cta: t('web.vtual.public.hero.two.cta'),
    image_url: null,
  }
})

onMounted(() => {
  if (!swiperEl.value) return

  swiper = new Swiper(swiperEl.value, {
    slidesPerView: 1,
    loop: true,
    speed: 400,
    effect: 'fade',
    fadeEffect: { crossFade: true },
    autoplay: { delay: 8000, disableOnInteraction: false },
    pagination: {
      el: '.js-vk-hero-pagination',
      clickable: true,
    },
    navigation: {
      nextEl: '.js-vk-hero-next',
      prevEl: '.js-vk-hero-prev',
    },
  })
})

onBeforeUnmount(() => {
  swiper?.destroy(true, true)
  swiper = null
})
</script>

<template>
  <div class="mx-auto w-full max-w-[1320px] px-5 min-[1500px]:px-[90px]">
    <div class="relative z-10 h-[420px] md:h-[460px] lg:h-[660px]">
      <div ref="swiperEl" class="swiper h-full w-full">
        <div class="swiper-wrapper">
          <!-- Slide 1 — hub intro -->
          <div class="swiper-slide">
            <div class="relative h-full w-full bg-gradient-to-br from-gray-100 via-gray-200 to-primary/20 dark:from-gray-900 dark:via-gray-800 dark:to-primary">
              <div class="container h-full">
                <div class="grid h-full grid-cols-12 place-items-center gap-x-5 md:gap-x-6 lg:gap-x-7.5">
                  <div class="col-span-10 col-start-2 self-center text-center md:col-span-12 md:col-start-1">
                    <div class="text-5xl font-bold leading-none tracking-tighter text-gray-900 dark:text-white md:text-6xl lg:text-8xl xl:text-9.5xl">
                      {{ t('web.vtual.public.hero.one.title_a') }}
                    </div>
                    <div class="-mt-[0.1em] text-6xl font-bold leading-none tracking-tighter text-accent md:text-7xl lg:text-9xl xl:text-10.5xl">
                      {{ t('web.vtual.public.hero.one.title_b') }}
                    </div>
                    <div class="mt-3 md:mt-1 lg:pb-9 xl:-mt-2.5 xl:pb-12">
                      <p class="mb-7 text-base font-medium leading-8 text-gray-600 dark:text-white lg:mb-10 lg:text-lg xl:mb-12 xl:pr-20">
                        {{ t('web.vtual.public.hero.one.text') }}
                      </p>
                      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <a
                          href="#vtubers"
                          class="inline-flex w-full justify-center bg-accent px-5 py-4 text-center font-bold uppercase leading-none text-gray-900 transition-colors hover:bg-accent/90 md:py-[21px] lg:w-auto lg:px-10"
                        >
                          {{ t('web.vtual.public.hero.one.cta') }}
                        </a>
                        <router-link
                          to="/register?redirect=/apps/vtual/profiles"
                          class="inline-flex w-full justify-center px-5 py-4 text-center font-bold uppercase leading-none text-gray-900 ring-1 ring-inset ring-gray-900 transition-colors hover:bg-gray-900 hover:text-white dark:text-white dark:ring-white dark:hover:bg-white dark:hover:text-gray-900 md:py-[21px] lg:w-auto lg:px-10"
                        >
                          {{ t('web.vtual.public.hero.two.cta') }}
                        </router-link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Slide 2 — content spotlight -->
          <div class="swiper-slide group">
            <div class="relative isolate h-full w-full bg-gray-900">
              <div class="container h-full">
                <div class="grid h-full grid-cols-12 place-items-center gap-y-10 md:gap-x-6 lg:gap-x-7.5">
                  <div class="col-span-full md:col-span-8 md:col-start-3 lg:col-span-10 lg:col-start-2 xl:col-span-6 xl:col-start-4">
                    <div class="px-6 text-center">
                      <div class="mb-1 flex flex-wrap justify-center gap-1 font-bold uppercase text-accent lg:mb-2">
                        <div>{{ spotlight.kicker || t('web.vtual.public.hero.two.kicker') }}</div>
                      </div>
                      <h2 class="mb-6 text-4xl font-bold leading-none tracking-tighter text-white sm:text-5xl md:mb-8 md:text-6xl md:leading-none lg:mb-12 lg:text-7xl lg:leading-none xl:text-[74px]">
                        <a
                          v-if="spotlight.url"
                          :href="spotlight.url"
                          target="_blank"
                          rel="noopener"
                          class="transition-opacity duration-300 hover:opacity-80"
                        >{{ spotlight.title }}</a>
                        <span v-else>{{ spotlight.title }}</span>
                      </h2>
                      <a
                        v-if="spotlight.url"
                        :href="spotlight.url"
                        target="_blank"
                        rel="noopener"
                        class="inline-flex justify-center gap-x-3 bg-primary px-4 py-4 text-center text-sm font-bold uppercase leading-none text-white transition-colors hover:bg-primary/90 md:py-[18px] lg:px-8"
                      >
                        {{ spotlight.cta || t('web.vtual.public.hero.spotlight_cta') }}
                      </a>
                      <a
                        v-else
                        href="#contents"
                        class="inline-flex justify-center gap-x-3 bg-primary px-4 py-4 text-center text-sm font-bold uppercase leading-none text-white transition-colors hover:bg-primary/90 md:py-[18px] lg:px-8"
                      >
                        {{ spotlight.cta || t('web.vtual.public.hero.spotlight_cta') }}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              <div
                class="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat transition-transform duration-[8000ms] ease-out group-[.swiper-slide-active]:scale-110"
                :style="{ backgroundImage: spotlight.image_url ? `url(${spotlight.image_url})` : 'none' }"
              ></div>
              <div class="absolute inset-0 -z-10 bg-gradient-to-br from-gray-900 via-gray-900/80 to-primary/80"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="js-vk-hero-pagination vv-hero-swiper-pagination absolute !bottom-auto !left-auto !right-2 top-1/2 z-20 flex !w-[34px] -translate-y-1/2 flex-col items-end gap-0.5 sm:!right-4 xl:!-right-16"></div>

      <div class="absolute bottom-0 right-0 z-10 flex justify-center gap-y-4 xl:-right-16 xl:flex-col">
        <button
          type="button"
          class="js-vk-hero-prev flex aspect-square w-8 items-center justify-center bg-white text-gray-900 ring-1 ring-gray-300 hover:cursor-pointer hover:text-accent dark:bg-gray-900 dark:text-white dark:ring-white/20 xl:rotate-90 xl:bg-transparent dark:xl:bg-transparent"
          :aria-label="t('web.vtual.public.hero.prev')"
        >
          <svg class="h-2.5 w-1.5" fill="currentColor">
            <use :href="`${spriteUrl}#arrow-left-pixel-alt`"></use>
          </svg>
        </button>
        <button
          type="button"
          class="js-vk-hero-next flex aspect-square w-8 items-center justify-center bg-white text-gray-900 ring-1 ring-gray-300 hover:cursor-pointer hover:text-accent dark:bg-gray-900 dark:text-white dark:ring-white/20 xl:rotate-90 xl:bg-transparent dark:xl:bg-transparent"
          :aria-label="t('web.vtual.public.hero.next')"
        >
          <svg class="h-2.5 w-1.5" fill="currentColor">
            <use :href="`${spriteUrl}#arrow-right-pixel-alt`"></use>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
