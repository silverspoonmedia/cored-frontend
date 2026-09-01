<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Swiper from 'swiper'
import { Autoplay, EffectFade, Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-fade'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import spriteUrl from '@/valkivid3/assets/img/sprite.svg'

const { t } = useI18n()

const swiperEl = ref<HTMLElement | null>(null)
let swiper: Swiper | null = null

// Slide 1 is the only slide that goes light (and only in light mode); slides 2/3
// stay dark (bg-gray-900) in both modes. Controls fork on this per-slide tone, not
// the global mode. CSS gates the light branch with :not(.dark), so we only need to
// distinguish slide-1 from the rest here.
const heroTone = ref<'light' | 'dark'>('light')

onMounted(() => {
  if (!swiperEl.value) return

  // `rtl` lives on a private options extension, not the core SwiperOptions
  // type; fade is direction-agnostic but pin it defensively in case the
  // effect ever changes to a directional one.
  const options = {
    modules: [Autoplay, EffectFade, Navigation, Pagination],
    slidesPerView: 1,
    loop: true,
    speed: 400,
    effect: 'fade',
    fadeEffect: { crossFade: true },
    rtl: document.documentElement.dir === 'rtl',
    autoplay: { delay: 8000, disableOnInteraction: false },
    pagination: {
      el: '.js-vk-hero-pagination',
      clickable: true,
    },
    navigation: {
      nextEl: '.js-vk-hero-next',
      prevEl: '.js-vk-hero-prev',
    },
  }

  swiper = new Swiper(swiperEl.value, options)

  const syncTone = () => {
    heroTone.value = swiper && swiper.realIndex === 0 ? 'light' : 'dark'
  }
  swiper.on('slideChange', syncTone)
  syncTone()
})

onBeforeUnmount(() => {
  swiper?.destroy(true, true)
  swiper = null
})
</script>

<template>
  <div class="mx-auto w-full max-w-[1320px]">
    <div class="relative z-10 h-[420px] md:h-[460px] lg:h-[660px]" :data-tone="heroTone">
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
                      <p class="mb-7 text-base font-medium leading-8 text-gray-600 dark:text-white lg:mb-10 lg:text-lg xl:mb-12 xl:pe-20">
                        {{ t('web.vtual.public.hero.one.text') }}
                      </p>
                      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <router-link
                          to="/vtual#vtubers"
                          class="inline-flex w-full justify-center bg-accent px-5 py-4 text-center font-bold uppercase leading-none text-white transition-colors hover:bg-accent-500 dark:text-gray-900 md:py-[21px] lg:w-auto lg:px-10"
                        >
                          {{ t('web.vtual.public.hero.one.cta') }}
                        </router-link>
                        <router-link
                          to="/register?redirect=/apps/vtual/profiles"
                          class="inline-flex w-full justify-center px-5 py-4 text-center font-bold uppercase leading-none text-gray-900 ring-1 ring-inset ring-gray-900 transition-colors hover:bg-slate-500 hover:text-white dark:text-white dark:ring-white dark:hover:bg-slate-400 dark:hover:text-gray-900 md:py-[21px] lg:w-auto lg:px-10"
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

          <!-- Slide 2 — claim profile promo -->
          <div class="swiper-slide group">
            <div class="relative isolate h-full w-full bg-gray-900">
              <div class="container h-full">
                <div class="grid h-full grid-cols-12 place-items-center gap-y-10 md:gap-x-6 lg:gap-x-7.5">
                  <div class="col-span-full md:col-span-8 md:col-start-3 lg:col-span-10 lg:col-start-2 xl:col-span-6 xl:col-start-4">
                    <div class="px-6 text-center">
                      <div class="mb-1 flex flex-wrap justify-center gap-1 font-bold uppercase text-accent lg:mb-2">
                        <div>{{ t('web.vtual.public.hero.two.kicker') }}</div>
                      </div>
                      <h2 class="mb-6 text-4xl font-bold leading-none tracking-tighter text-white sm:text-5xl md:mb-8 md:text-6xl md:leading-none lg:mb-12 lg:text-7xl lg:leading-none xl:text-[74px]">
                        {{ t('web.vtual.public.hero.two.title_a') }} {{ t('web.vtual.public.hero.two.title_b') }}
                      </h2>
                      <p class="mb-8 text-base font-medium leading-8 text-gray-300 lg:text-lg">
                        {{ t('web.vtual.public.hero.two.text') }}
                      </p>
                      <router-link
                        to="/register?redirect=/apps/vtual/profiles"
                        class="inline-flex justify-center gap-x-3 bg-primary px-4 py-4 text-center text-sm font-bold uppercase leading-none text-white transition-colors hover:bg-primary-500 dark:text-gray-900 md:py-[18px] lg:px-8"
                      >
                        {{ t('web.vtual.public.hero.two.cta') }}
                      </router-link>
                    </div>
                  </div>
                </div>
              </div>
              <div class="absolute inset-0 -z-10 bg-gradient-to-br from-gray-900 via-gray-900/80 to-primary/80"></div>
            </div>
          </div>

          <!-- Slide 3 — events promo -->
          <div class="swiper-slide group">
            <div class="relative isolate h-full w-full bg-gray-900">
              <div class="container h-full">
                <div class="grid h-full grid-cols-12 items-end md:gap-x-6 lg:gap-x-7.5">
                  <div class="col-span-full pb-8 sm:pb-10 md:col-span-6 md:pb-12">
                    <div class="text-start">
                      <div class="mb-1 flex flex-wrap gap-1 font-bold uppercase text-accent lg:mb-2">
                        <div>{{ t('web.vtual.public.hero.three.kicker') }}</div>
                      </div>
                      <h2 class="mb-4 text-2xl font-bold leading-none tracking-tight text-white sm:text-3xl md:mb-5 md:text-4xl md:leading-none lg:mb-7 lg:text-5xl lg:leading-none xl:text-[62px]">
                        {{ t('web.vtual.public.hero.three.title_a') }} {{ t('web.vtual.public.hero.three.title_b') }}
                      </h2>
                      <p class="mb-6 text-base font-medium leading-8 text-gray-300 lg:text-lg">
                        {{ t('web.vtual.public.hero.three.text') }}
                      </p>
                      <router-link to="/vtual#events"
                        class="inline-flex justify-center gap-x-3 bg-accent px-4 py-4 text-center text-sm font-bold uppercase leading-none text-white transition-colors hover:bg-accent-500 dark:text-gray-900 md:py-[18px] lg:px-8"
                      >
                        {{ t('web.vtual.public.hero.three.cta') }}
                      </router-link>
                    </div>
                  </div>
                </div>
              </div>
              <div class="absolute inset-0 -z-10 bg-gradient-to-br from-gray-900 via-gray-900/80 to-primary/80"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="js-vk-hero-pagination vv-hero-swiper-pagination absolute !end-2 sm:!end-4 2xl:!-end-16 top-1/2 !start-auto -translate-y-1/2 !bottom-auto z-20 flex !w-[34px] flex-col items-end gap-0.5"></div>

      <div class="absolute bottom-0 end-0 z-10 flex justify-center gap-y-4 2xl:-end-16 xl:flex-col">
        <button
          type="button"
          class="js-vk-hero-prev flex aspect-square w-8 items-center justify-center text-white hover:cursor-pointer hover:text-accent xl:rotate-90 bg-gray-900 xl:bg-transparent dark:bg-gray-900 dark:xl:bg-transparent rtl:rotate-180"
          :aria-label="t('web.vtual.public.hero.prev')"
        >
          <svg class="h-2.5 w-1.5" fill="currentColor">
            <use :href="`${spriteUrl}#arrow-left-pixel-alt`"></use>
          </svg>
        </button>

        <button
          type="button"
          class="js-vk-hero-next flex aspect-square w-8 items-center justify-center text-white hover:cursor-pointer hover:text-accent xl:rotate-90 bg-gray-900 xl:bg-transparent dark:bg-gray-900 dark:xl:bg-transparent rtl:rotate-180"
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
