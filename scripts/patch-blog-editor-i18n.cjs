#!/usr/bin/env node
/**
 * One-shot: inject web.blog.editor.* and web.blog.featured.* keys into all 7
 * locale files. English is the source; others are translated contextually.
 */
const fs = require('fs')
const path = require('path')

const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales')

const translations = {
  'en.json': {
    editor: {
      placeholder: 'Write something…',
      undo: 'Undo',
      redo: 'Redo',
      bold: 'Bold',
      italic: 'Italic',
      strike: 'Strikethrough',
      bullet_list: 'Bullet list',
      ordered_list: 'Numbered list',
      blockquote: 'Quote',
      code_block: 'Code block',
      link: 'Insert link',
      unlink: 'Remove link',
      image: 'Insert image',
      remove_image: 'Remove image',
      link_prompt: 'Enter URL (leave empty to remove link)',
    },
    featured: {
      pick: 'Choose image',
      replace: 'Replace',
      remove: 'Remove',
      uploading: 'Uploading…',
      alt: 'Featured image preview',
    },
  },
  'id.json': {
    editor: {
      placeholder: 'Tulis sesuatu…',
      undo: 'Urungkan',
      redo: 'Ulangi',
      bold: 'Tebal',
      italic: 'Miring',
      strike: 'Coret',
      bullet_list: 'Daftar poin',
      ordered_list: 'Daftar bernomor',
      blockquote: 'Kutipan',
      code_block: 'Blok kode',
      link: 'Sisipkan tautan',
      unlink: 'Hapus tautan',
      image: 'Sisipkan gambar',
      remove_image: 'Hapus gambar',
      link_prompt: 'Masukkan URL (kosongkan untuk menghapus tautan)',
    },
    featured: {
      pick: 'Pilih gambar',
      replace: 'Ganti',
      remove: 'Hapus',
      uploading: 'Mengunggah…',
      alt: 'Pratinjau gambar unggulan',
    },
  },
  'ja.json': {
    editor: {
      placeholder: '本文を入力してください…',
      undo: '元に戻す',
      redo: 'やり直す',
      bold: '太字',
      italic: '斜体',
      strike: '取り消し線',
      bullet_list: '箇条書き',
      ordered_list: '番号付きリスト',
      blockquote: '引用',
      code_block: 'コードブロック',
      link: 'リンクを挿入',
      unlink: 'リンクを解除',
      image: '画像を挿入',
      remove_image: '画像を削除',
      link_prompt: 'URL を入力（空でリンク解除）',
    },
    featured: {
      pick: '画像を選択',
      replace: '変更',
      remove: '削除',
      uploading: 'アップロード中…',
      alt: 'アイキャッチ画像のプレビュー',
    },
  },
  'ko.json': {
    editor: {
      placeholder: '내용을 입력하세요…',
      undo: '실행 취소',
      redo: '다시 실행',
      bold: '굵게',
      italic: '기울임꼴',
      strike: '취소선',
      bullet_list: '글머리 기호',
      ordered_list: '번호 매기기 목록',
      blockquote: '인용',
      code_block: '코드 블록',
      link: '링크 삽입',
      unlink: '링크 제거',
      image: '이미지 삽입',
      remove_image: '이미지 제거',
      link_prompt: 'URL 을 입력하세요 (비우면 링크 제거)',
    },
    featured: {
      pick: '이미지 선택',
      replace: '바꾸기',
      remove: '제거',
      uploading: '업로드 중…',
      alt: '대표 이미지 미리보기',
    },
  },
  'zh-CN.json': {
    editor: {
      placeholder: '写点什么…',
      undo: '撤销',
      redo: '重做',
      bold: '加粗',
      italic: '斜体',
      strike: '删除线',
      bullet_list: '无序列表',
      ordered_list: '有序列表',
      blockquote: '引用',
      code_block: '代码块',
      link: '插入链接',
      unlink: '移除链接',
      image: '插入图片',
      remove_image: '移除图片',
      link_prompt: '输入 URL（留空则移除链接）',
    },
    featured: {
      pick: '选择图片',
      replace: '更换',
      remove: '移除',
      uploading: '上传中…',
      alt: '特色图片预览',
    },
  },
  'ar.json': {
    editor: {
      placeholder: 'اكتب شيئًا…',
      undo: 'تراجع',
      redo: 'إعادة',
      bold: 'عريض',
      italic: 'مائل',
      strike: 'مشطوب',
      bullet_list: 'قائمة نقطية',
      ordered_list: 'قائمة مرقمة',
      blockquote: 'اقتباس',
      code_block: 'كتلة تعليمات برمجية',
      link: 'إدراج رابط',
      unlink: 'إزالة الرابط',
      image: 'إدراج صورة',
      remove_image: 'إزالة الصورة',
      link_prompt: 'أدخل الرابط (اتركه فارغًا لإزالة الرابط)',
    },
    featured: {
      pick: 'اختيار صورة',
      replace: 'استبدال',
      remove: 'إزالة',
      uploading: 'جارٍ الرفع…',
      alt: 'معاينة الصورة البارزة',
    },
  },
  'ru.json': {
    editor: {
      placeholder: 'Напишите что-нибудь…',
      undo: 'Отменить',
      redo: 'Повторить',
      bold: 'Полужирный',
      italic: 'Курсив',
      strike: 'Зачёркнутый',
      bullet_list: 'Маркированный список',
      ordered_list: 'Нумерованный список',
      blockquote: 'Цитата',
      code_block: 'Блок кода',
      link: 'Вставить ссылку',
      unlink: 'Убрать ссылку',
      image: 'Вставить изображение',
      remove_image: 'Убрать изображение',
      link_prompt: 'Введите URL (оставьте пустым, чтобы убрать ссылку)',
    },
    featured: {
      pick: 'Выбрать изображение',
      replace: 'Заменить',
      remove: 'Убрать',
      uploading: 'Загрузка…',
      alt: 'Предпросмотр главного изображения',
    },
  },
}

for (const [file, patch] of Object.entries(translations)) {
  const filePath = path.join(localesDir, file)
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'))

  json.web.blog.editor = patch.editor
  json.web.blog.featured = patch.featured

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8')
  console.log(`Patched ${file}`)
}
