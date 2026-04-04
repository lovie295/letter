import { useEffect, useMemo, useState } from 'react'
import { isSupabaseEnabled, supabase } from './supabase'

const paperTones = [
  {
    id: 'white',
    name: 'White',
    paper: 'linear-gradient(180deg, #fffefb 0%, #faf6ee 100%)',
    envelope: 'linear-gradient(180deg, #f6efe5 0%, #eadcc8 100%)',
    accent: '#8a715b',
    ink: '#453127',
  },
  {
    id: 'cream',
    name: 'Cream',
    paper: 'linear-gradient(180deg, #fffdf8 0%, #f4ead8 100%)',
    envelope: 'linear-gradient(180deg, #f6ecde 0%, #e7d3bb 100%)',
    accent: '#8d6a4f',
    ink: '#453127',
  },
  {
    id: 'blush',
    name: 'Blush',
    paper: 'linear-gradient(180deg, #fffaf8 0%, #f6e7e3 100%)',
    envelope: 'linear-gradient(180deg, #f8ebe7 0%, #e8ccc4 100%)',
    accent: '#9d6a67',
    ink: '#4f302d',
  },
]

const paperTextures = [
  { id: 'smooth', name: 'Smooth', overlay: 'none', size: 'auto' },
  {
    id: 'grain',
    name: 'Grain',
    overlay:
      'radial-gradient(circle at 1px 1px, rgba(110, 89, 71, 0.14) 0.55px, transparent 0), radial-gradient(circle at 2px 2px, rgba(110, 89, 71, 0.08) 0.45px, transparent 0)',
    size: '4px 4px',
  },
  {
    id: 'linen',
    name: 'Linen',
    overlay:
      'linear-gradient(90deg, rgba(120, 97, 76, 0.045) 1px, transparent 1px), linear-gradient(rgba(120, 97, 76, 0.04) 1px, transparent 1px)',
    size: '10px 10px',
  },
]

const handwritingFonts = [
  { id: 'zen', name: 'Zen Kurenaido', family: "'Zen Kurenaido', cursive" },
  { id: 'yomogi', name: 'Yomogi', family: "'Yomogi', cursive" },
  { id: 'yuji', name: 'Yuji Syuku', family: "'Yuji Syuku', cursive" },
]

const defaultDraft = {
  to: '',
  from: '',
  message: '',
  designId: 'white:smooth:zen',
  showDate: false,
}

const MESSAGE_MAX_LENGTH = 500
const LETTER_PAGE_SIZE = 100
const DRAFT_STORAGE_KEY = 'letter-draft'
const TREASURE_STORAGE_KEY = 'letter-treasure-box'
const SESSION_STORAGE_KEY = 'letter-session-user'
const AUTH_USERS_STORAGE_KEY = 'letter-auth-users'
const DEMO_USER = {
  id: 'demo-user',
  name: 'Rin',
  email: 'demo@letter.local',
  password: 'letter1234',
}
const DEMO_TREASURE_LETTER = {
  id: 'demo-letter-1',
  recipient_name: '未来のわたしへ',
  sender_name: 'Rin',
  message:
    '今日はちゃんと立ち止まって、言葉を残してみました。\n少し先で読み返したときに、この日のやわらかい気持ちまで思い出せますように。',
  design_id: 'white:smooth:zen',
  show_date: true,
  created_at: '2026-04-04T09:00:00.000Z',
}
const COLLECTION_TEST_ITEMS = Array.from({ length: 15 }, (_, index) => ({
  id: `collection-test-${index + 1}`,
  recipient_name: '',
  sender_name: ['Rin', 'みかんより', 'ラーメン', 'haru', 'Sora'][index % 5],
  message: 'これはコレクション画面の見え方を確認するためのダミー手紙です。',
  design_id: 'white:smooth:zen',
  show_date: false,
  created_at: new Date(2026, 3, 4 - (index % 5), 9, 0, 0).toISOString(),
}))

function readJsonStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function saveTreasureLetter(letter) {
  const currentItems = readJsonStorage(TREASURE_STORAGE_KEY, [])
  const nextItems = [
    {
      id: letter.id,
      recipient_name: letter.recipient_name,
      sender_name: letter.sender_name,
      message: letter.message,
      design_id: letter.design_id,
      show_date: letter.show_date,
      created_at: letter.created_at,
    },
    ...currentItems.filter((item) => item.id !== letter.id),
  ]

  window.localStorage.setItem(TREASURE_STORAGE_KEY, JSON.stringify(nextItems))
  return nextItems
}

function seedLocalDemoData() {
  const users = readJsonStorage(AUTH_USERS_STORAGE_KEY, [])
  if (!users.some((user) => user.email === DEMO_USER.email)) {
    window.localStorage.setItem(AUTH_USERS_STORAGE_KEY, JSON.stringify([...users, DEMO_USER]))
  }

  const treasure = readJsonStorage(TREASURE_STORAGE_KEY, [])
  if (!treasure.some((item) => item.id === DEMO_TREASURE_LETTER.id)) {
    window.localStorage.setItem(TREASURE_STORAGE_KEY, JSON.stringify([DEMO_TREASURE_LETTER, ...treasure]))
  }
}

function splitMessageIntoPages(message) {
  const text = message ?? ''
  if (!text.length) return ['']

  const pages = []
  for (let index = 0; index < text.length; index += LETTER_PAGE_SIZE) {
    pages.push(text.slice(index, index + LETTER_PAGE_SIZE))
  }
  return pages
}

function buildShareUrl(letterId) {
  const url = new URL(window.location.href)
  url.search = `?letter=${letterId}`
  url.hash = ''
  return url.toString()
}

function getLetterIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('letter')
}

function getDesignById(designId) {
  const [toneId = 'white', textureId = 'smooth', fontId = 'zen'] = (designId ?? 'white:smooth:zen').split(':')
  const tone = paperTones.find((item) => item.id === toneId) ?? paperTones[0]
  const texture = paperTextures.find((item) => item.id === textureId) ?? paperTextures[0]
  const font = handwritingFonts.find((item) => item.id === fontId) ?? handwritingFonts[0]

  return {
    id: `${tone.id}:${texture.id}:${font.id}`,
    paper: tone.paper,
    envelope: tone.envelope,
    accent: tone.accent,
    ink: tone.ink,
    textureOverlay: texture.overlay,
    textureSize: texture.size,
    textureId: texture.id,
    toneId: tone.id,
    fontId: font.id,
    fontFamily: font.family,
  }
}

function AnimatedLetterMessage({ message, active }) {
  const characters = useMemo(() => Array.from(message ?? ''), [message])
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (!active) {
      setVisibleCount(0)
      return
    }

    setVisibleCount(0)

    const timer = window.setInterval(() => {
      setVisibleCount((current) => {
        if (current >= characters.length) {
          window.clearInterval(timer)
          return current
        }

        const nextChar = characters[current]
        const step = nextChar === '\n' ? 1 : 1
        return Math.min(characters.length, current + step)
      })
    }, 95)

    return () => window.clearInterval(timer)
  }, [active, characters])

  return (
    <div className="letter-writing">
      <div className="letter-message" aria-label={message}>
        {characters.map((character, index) => {
          const isVisible = index < visibleCount
          return (
            <span
              key={`${character}-${index}`}
              className={`letter-char ${isVisible ? 'visible' : ''} ${character === '\n' ? 'line-break' : ''}`}
            >
              {character === '\n' ? '\n' : character}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function LetterView({ letter, onBackHome, onOpened, onStoreInTreasure }) {
  const [opened, setOpened] = useState(false)
  const [showFinishedModal, setShowFinishedModal] = useState(false)
  const design = useMemo(() => getDesignById(letter.design_id), [letter.design_id])

  const handleOpen = () => {
    if (opened) return
    setOpened(true)
    onOpened(letter.id)
  }

  const handleStoreInTreasure = () => {
    setShowFinishedModal(false)
    onStoreInTreasure(letter)
  }

  return (
    <main className="page">
      {showFinishedModal ? (
        <div className="modal-backdrop">
          <div className="center-modal">
            <div className="action-row modal-actions">
              <button className="secondary-button" type="button" onClick={handleStoreInTreasure}>
                宝箱に入れる
              </button>
              <button className="ghost-button" type="button" onClick={onBackHome}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="receiver-shell minimal-receiver">
        <div
          className={`envelope-stage ${opened ? 'opened' : ''}`}
          style={{ '--envelope': design.envelope, '--accent': design.accent }}
        >
          <button className="envelope" onClick={handleOpen} type="button">
            <div className="envelope-flap" />
            <div className="envelope-body">
              <span>{opened ? '手紙を読んでいます' : 'タップして開封'}</span>
            </div>
          </button>

          <article
            className={`letter-sheet simple-letter ${opened ? 'visible' : ''}`}
            style={{ '--paper': design.paper, '--ink': design.ink, '--letter-font': design.fontFamily }}
          >
            <div className="paper-texture" style={{ '--texture-overlay': design.textureOverlay, '--texture-size': design.textureSize }} />
            {letter.show_date ? <div className="letter-date">{new Date(letter.created_at).toLocaleDateString('ja-JP')}</div> : null}
            {letter.recipient_name ? <div className="letter-recipient">{letter.recipient_name}</div> : null}
            <AnimatedLetterMessage message={letter.message} active={opened} />
            {letter.sender_name ? <div className="letter-sign">{letter.sender_name}</div> : null}
          </article>
        </div>

        <button className="secondary-button done-button" type="button" onClick={() => setShowFinishedModal(true)}>
          読み終えた
        </button>
      </section>
    </main>
  )
}

function ComposerView({
  draft,
  setDraft,
  isSaving,
  shareUrl,
  copied,
  saveError,
  activePreviewPage,
  setActivePreviewPage,
  handleSeal,
  handleCopy,
  handleSaveDraft,
  resetDraft,
  sessionUser,
  onOpenAuth,
  onOpenCollection,
}) {
  const [showPaperOptions, setShowPaperOptions] = useState(false)
  const [showDraftToast, setShowDraftToast] = useState(false)
  const [sealModalStep, setSealModalStep] = useState('closed')
  const [sealModalError, setSealModalError] = useState('')
  const selectedDesign = useMemo(() => getDesignById(draft.designId), [draft.designId])
  const messagePages = useMemo(() => splitMessageIntoPages(draft.message), [draft.message])
  const totalPages = messagePages.length
  const currentPreviewPage = Math.min(activePreviewPage, totalPages - 1)
  const previewText = messagePages[currentPreviewPage] ?? ''
  const canSeal =
    draft.message.trim().length >= 10 && draft.to.trim().length > 0 && draft.from.trim().length > 0

  const syncPreviewPageFromSelection = (event) => {
    const selectionStart = event.target.selectionStart ?? 0
    const nextPage = Math.min(Math.floor(selectionStart / LETTER_PAGE_SIZE), totalPages - 1)
    setActivePreviewPage(nextPage)
  }

  const handleMessageChange = (event) => {
    const nextMessage = event.target.value
    setDraft({ ...draft, message: nextMessage })

    const selectionStart = event.target.selectionStart ?? nextMessage.length
    const nextTotalPages = Math.max(1, Math.ceil(nextMessage.length / LETTER_PAGE_SIZE))
    const nextPage = Math.min(Math.floor(selectionStart / LETTER_PAGE_SIZE), nextTotalPages - 1)
    setActivePreviewPage(nextPage)
  }

  const handleToneChange = (toneId) => {
    setDraft({ ...draft, designId: `${toneId}:${selectedDesign.textureId}:${selectedDesign.fontId}` })
  }

  const handleTextureChange = (textureId) => {
    setDraft({ ...draft, designId: `${selectedDesign.toneId}:${textureId}:${selectedDesign.fontId}` })
  }

  const handleFontChange = (fontId) => {
    setDraft({ ...draft, designId: `${selectedDesign.toneId}:${selectedDesign.textureId}:${fontId}` })
  }

  const handleDraftPause = () => {
    handleSaveDraft()
    setShowDraftToast(true)
  }

  const handleSealConfirmSubmit = async () => {
    setSealModalError('')
    const nextShareUrl = await handleSeal()
    if (nextShareUrl) {
      setSealModalStep('shared')
      return
    }

    setSealModalError('保存に失敗しました。Supabase のテーブル設定を確認してください。')
  }

  const handleCloseShareModal = () => {
    setSealModalStep('closed')
    resetDraft()
  }

  useEffect(() => {
    if (!showDraftToast) return undefined

    const timer = window.setTimeout(() => setShowDraftToast(false), 5000)
    return () => window.clearTimeout(timer)
  }, [showDraftToast])

  useEffect(() => {
    if (!shareUrl) return
    setSealModalStep('shared')
  }, [shareUrl])

  return (
    <main className="page">
      {showDraftToast ? <div className="floating-toast">一旦保存しました</div> : null}

      {sealModalStep !== 'closed' ? (
        <div className="modal-backdrop">
          <div className="center-modal">
            {sealModalStep === 'confirm' ? (
              <>
                <p className="modal-message">もう書き直せないけれど、このまま封を閉じますか？</p>
                {sealModalError ? <div className="modal-inline-error">{sealModalError}</div> : null}
                <div className="action-row modal-actions">
                  <button className="ghost-button" type="button" onClick={() => setSealModalStep('closed')}>
                    もう一度考える
                  </button>
                  <button className="primary-button" type="button" onClick={handleSealConfirmSubmit} disabled={isSaving}>
                    {isSaving ? '保存中...' : '封を閉じる'}
                  </button>
                </div>
              </>
            ) : null}

            {sealModalStep === 'shared' && shareUrl ? (
              <div className="share-modal">
                <p className="modal-message">これを共有しよう！</p>
                <div className="share-url">{shareUrl}</div>
                <div className="action-row modal-actions">
                  <button className="secondary-button" type="button" onClick={handleCopy}>
                    {copied ? 'コピー済み' : 'URLをコピー'}
                  </button>
                  <button className="ghost-button" type="button" onClick={handleCloseShareModal}>
                    閉じる
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className="composer-layout simple-composer">
        <div className="composer-panel">
          <div className="panel-header">
            <div className="panel-header-actions">
              <button
                className="ghost-button header-auth-button"
                type="button"
                onClick={sessionUser ? onOpenCollection : onOpenAuth}
              >
                {sessionUser ? 'コレクション' : 'ログイン'}
              </button>
            </div>
            <button className="paper-options-button" type="button" onClick={() => setShowPaperOptions((current) => !current)}>
              <span className="paper-icon" aria-hidden="true">
                <span className="slider-line top" />
                <span className="slider-line middle" />
                <span className="slider-line bottom" />
                <span className="slider-knob top" />
                <span className="slider-knob middle" />
                <span className="slider-knob bottom" />
              </span>
            </button>
          </div>
          {!isSupabaseEnabled ? (
            <div className="status-card warning">
              <strong>Supabase未接続</strong>
            </div>
          ) : null}

          {showPaperOptions ? (
            <div className="paper-options-card">
              <div className="paper-options-group">
                <div className="paper-options-label">紙色</div>
                <div className="paper-chip-row">
                  {paperTones.map((tone) => (
                    <button
                      key={tone.id}
                      type="button"
                      className={`paper-chip ${selectedDesign.toneId === tone.id ? 'selected' : ''}`}
                      onClick={() => handleToneChange(tone.id)}
                    >
                      {tone.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="paper-options-group">
                <div className="paper-options-label">紙質感</div>
                <div className="paper-chip-row">
                  {paperTextures.map((texture) => (
                    <button
                      key={texture.id}
                      type="button"
                      className={`paper-chip ${selectedDesign.textureId === texture.id ? 'selected' : ''}`}
                      onClick={() => handleTextureChange(texture.id)}
                    >
                      {texture.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="paper-options-group">
                <div className="paper-options-label">手書きフォント</div>
                <div className="paper-chip-row">
                  {handwritingFonts.map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      className={`paper-chip ${selectedDesign.fontId === font.id ? 'selected' : ''}`}
                      onClick={() => handleFontChange(font.id)}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <label>
            To
            <input
              value={draft.to}
              onChange={(event) => setDraft({ ...draft, to: event.target.value })}
              placeholder="例: いつも支えてくれるあなたへ"
            />
          </label>
          <label>
            From
            <input
              value={draft.from}
              onChange={(event) => setDraft({ ...draft, from: event.target.value })}
              placeholder="例: Rin"
            />
          </label>
          <label>
            想い
            <textarea
              value={draft.message}
              onChange={handleMessageChange}
              onClick={syncPreviewPageFromSelection}
              onKeyUp={syncPreviewPageFromSelection}
              onSelect={syncPreviewPageFromSelection}
              placeholder="いつもありがとう、を少し丁寧に届けるための言葉を書いてみてください。"
              rows={8}
              maxLength={MESSAGE_MAX_LENGTH}
            />
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={draft.showDate}
              onChange={(event) => setDraft({ ...draft, showDate: event.target.checked })}
            />
            <span>日付を入れる</span>
          </label>
          <div className="character-count">
            {draft.message.length}/{MESSAGE_MAX_LENGTH}
          </div>

          <div className="action-row">
            <button className="ghost-button" type="button" onClick={handleDraftPause}>
              一旦寝かす
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={!canSeal || isSaving || !isSupabaseEnabled}
              onClick={() => setSealModalStep('confirm')}
            >
              封を閉じる
            </button>
            <button className="ghost-button" type="button" onClick={resetDraft}>
              書き直す
            </button>
          </div>

          {saveError ? <div className="status-card error">{saveError}</div> : null}
        </div>

        <div className="preview-panel">
          <div className="preview-stage">
            <div className="preview-stack" aria-hidden="true">
              {currentPreviewPage + 1 < totalPages ? <div className="preview-shadow-page second" /> : null}
              {currentPreviewPage + 2 < totalPages ? <div className="preview-shadow-page third" /> : null}
            </div>
            <div
              className="preview-paper"
              style={{ '--paper': selectedDesign.paper, '--ink': selectedDesign.ink, '--letter-font': selectedDesign.fontFamily }}
            >
              <div className="paper-texture" style={{ '--texture-overlay': selectedDesign.textureOverlay, '--texture-size': selectedDesign.textureSize }} />
              {draft.showDate ? <div className="letter-date">{new Date().toLocaleDateString('ja-JP')}</div> : null}
              {draft.to ? <div className="letter-recipient">{draft.to}</div> : null}
              <div className="letter-message preview-message">{previewText}</div>
              {draft.from ? <div className="letter-sign">{draft.from}</div> : null}
            </div>
            <div className="preview-page-indicator">
              {currentPreviewPage + 1}/{totalPages}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function LandingView({ sessionUser, onLogin, onCreateLetter, onOpenCollection }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleCollectionClick = () => {
    setMobileMenuOpen(false)
    if (sessionUser) {
      onOpenCollection()
      return
    }

    onLogin()
  }

  return (
    <div className="landing-page">
      <div className={`landing-mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <button className="landing-mobile-menu-close" type="button" onClick={() => setMobileMenuOpen(false)}>
          ✕
        </button>
        <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>
          使い方
        </a>
        <button type="button" onClick={handleCollectionClick}>
          コレクション
        </button>
        <a href="#faq-lite" onClick={() => setMobileMenuOpen(false)}>
          よくある質問
        </a>
      </div>

      <nav className="landing-nav">
        <button className="landing-nav-logo" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          DIGITAL LETTER
        </button>
        <div className="landing-nav-links">
          <a href="#how-it-works">使い方</a>
          <button type="button" onClick={sessionUser ? onOpenCollection : onLogin}>
            コレクション
          </button>
          <a href="#faq-lite">よくある質問</a>
        </div>
        <button className="landing-nav-hamburger" type="button" onClick={() => setMobileMenuOpen(true)}>
          <span />
          <span />
          <span />
        </button>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-left">
          <p className="landing-hero-eyebrow">Digital Letter</p>
          <h1 className="landing-hero-title">
            言葉を、
            <br />
            ちゃんと
            <em>手紙</em>
            として
            <br />
            届ける。
          </h1>
          <p className="landing-hero-sub">
            アプリを入れなくても、
            <br />
            リンクひとつで気持ちを渡せる。
            <br />
            書いた言葉は、あとからそっと読み返せます。
          </p>
          <div className="landing-hero-actions">
            <button className="landing-btn-primary" type="button" onClick={onCreateLetter}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              手紙をつくる
            </button>
            <button className="landing-btn-secondary" type="button" onClick={sessionUser ? onOpenCollection : onLogin}>
              {sessionUser ? 'コレクションを見る' : 'ログイン'}
            </button>
          </div>
        </div>

        <div className="landing-hero-right" aria-hidden="true">
          <div className="landing-paper-scene">
            <div className="landing-paper landing-paper-back" />

            <div className="landing-paper landing-paper-mid">
              <div className="landing-paper-lines">
                {Array.from({ length: 7 }, (_, index) => (
                  <div key={`mid-${index}`} className="landing-paper-line" />
                ))}
              </div>
            </div>

            <div className="landing-paper landing-paper-front">
              <div className="landing-paper-stamp">
                <div className="landing-paper-stamp-inner">✉</div>
              </div>
              <p className="landing-paper-date">April 4, 2026</p>

              <div className="landing-paper-greeting">
                <p className="landing-paper-greeting-text">
                  拝啓、
                  <br />
                  春の日差しが心地よい
                  <br />
                  季節になりました。
                </p>
                <div className="landing-paper-greeting-line" />
              </div>

              <div className="landing-paper-lines">
                {Array.from({ length: 8 }, (_, index) => (
                  <div key={`front-${index}`} className="landing-paper-line" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-features">
        <p className="landing-section-label">Features</p>
        <div className="landing-features-grid">
          <div className="landing-feature-item">
            <svg className="landing-feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
              <path d="M10.172 13.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.102-1.101" />
            </svg>
            <p className="landing-feature-title">リンクで渡せる</p>
            <p className="landing-feature-desc">アプリのインストール不要。URLを送るだけで、相手はすぐに手紙を受け取れます。</p>
          </div>
          <div className="landing-feature-item">
            <svg className="landing-feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <p className="landing-feature-title">手紙として残る</p>
            <p className="landing-feature-desc">チャットとは違う、手紙としての重さと美しさ。あとからゆっくり読み返せます。</p>
          </div>
          <div className="landing-feature-item">
            <svg className="landing-feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="landing-feature-title">コレクションで管理</p>
            <p className="landing-feature-desc">大切な手紙をコレクションに保存。あの日の言葉を、いつでも手元に。</p>
          </div>
        </div>
      </section>

      <section className="landing-how" id="how-it-works">
        <p className="landing-section-label">How it works</p>
        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step-num">1</div>
            <p className="landing-step-title">書く</p>
            <p className="landing-step-desc">テンプレートを選んで、想いを言葉にする。便箋のように、丁寧に。</p>
          </div>
          <div className="landing-step">
            <div className="landing-step-num">2</div>
            <p className="landing-step-title">渡す</p>
            <p className="landing-step-desc">生成されたリンクをコピーして、メッセージやSNSで相手に届ける。</p>
          </div>
          <div className="landing-step">
            <div className="landing-step-num">3</div>
            <p className="landing-step-title">読む</p>
            <p className="landing-step-desc">相手はリンクを開くだけ。美しいレイアウトで、あなたの言葉が届く。</p>
          </div>
        </div>
      </section>

      <section className="landing-cta" id="faq-lite">
        <div className="landing-cta-inner">
          <p className="landing-cta-label">Start writing</p>
          <h2 className="landing-cta-title">
            今日、誰かに
            <br />
            手紙を書いてみませんか。
          </h2>
          <button className="landing-btn-light" type="button" onClick={onCreateLetter}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            手紙をつくる
          </button>
        </div>
      </section>

      <footer className="landing-footer">
        <span className="landing-footer-logo">DIGITAL LETTER</span>
        <span className="landing-footer-copy">© 2026 Digital Letter. All rights reserved.</span>
      </footer>
    </div>
  )
}

function AuthView({ initialMode = 'signup', onAuthSuccess, onBack }) {
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    const trimmedName = name.trim()

    if (!trimmedEmail || !password.trim()) {
      setError('メールアドレスとパスワードを入力してください。')
      return
    }

    if (mode === 'signup' && !trimmedName) {
      setError('表示名を入力してください。')
      return
    }

    const existingUsers = readJsonStorage(AUTH_USERS_STORAGE_KEY, [])
    const existingUser = existingUsers.find((user) => user.email === trimmedEmail)

    if (mode === 'signup') {
      if (existingUser) {
        setError('このメールアドレスはすでに使われています。')
        return
      }

      const nextUser = {
        id: crypto.randomUUID(),
        name: trimmedName,
        email: trimmedEmail,
        password,
      }

      const nextUsers = [...existingUsers, nextUser]
      window.localStorage.setItem(AUTH_USERS_STORAGE_KEY, JSON.stringify(nextUsers))
      window.localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ id: nextUser.id, name: nextUser.name, email: nextUser.email }),
      )
      onAuthSuccess({ id: nextUser.id, name: nextUser.name, email: nextUser.email })
      return
    }

    if (!existingUser || existingUser.password !== password) {
      setError('メールアドレスかパスワードが違います。')
      return
    }

    const sessionUser = { id: existingUser.id, name: existingUser.name, email: existingUser.email }
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser))
    onAuthSuccess(sessionUser)
  }

  return (
    <main className="page">
      <section className="auth-shell">
        <div className="auth-card">
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              type="button"
              onClick={() => {
                setMode('signup')
                setError('')
              }}
            >
              アカウント登録
            </button>
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              type="button"
              onClick={() => {
                setMode('login')
                setError('')
              }}
            >
              ログイン
            </button>
          </div>

          <div className="auth-copy">
            <h1 className="auth-title">{mode === 'signup' ? '宝箱をひらく準備をしよう' : '宝箱にしまった手紙を見にいこう'}</h1>
            <p className="auth-lead">
              {mode === 'signup'
                ? '宝箱に入れた手紙を、あとからそっと読み返せるようにします。'
                : '前にしまった手紙たちが、静かに待っています。'}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'signup' ? (
              <label>
                表示名
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="例: Rin" />
              </label>
            ) : null}
            <label>
              メールアドレス
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </label>
            <label>
              パスワード
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="8文字以上がおすすめです"
              />
            </label>

            {error ? <div className="status-card error">{error}</div> : null}

            <div className="action-row auth-actions">
              <button className="ghost-button" type="button" onClick={onBack}>
                閉じる
              </button>
              <button className="primary-button" type="submit">
                {mode === 'signup' ? '登録して宝箱へ' : 'ログインして宝箱へ'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}

function CollectionView({ user, onBackHome, onLogout }) {
  const [items, setItems] = useState(() => readJsonStorage(TREASURE_STORAGE_KEY, []))
  const [selectedLetter, setSelectedLetter] = useState(null)
  const [openedLetterId, setOpenedLetterId] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const itemsPerPage = 6

  useEffect(() => {
    setItems(readJsonStorage(TREASURE_STORAGE_KEY, []))
  }, [])

  const displayItems = useMemo(() => {
    const realItems = items.length ? items : []
    const fillerCount = Math.max(0, 15 - realItems.length)
    return [...realItems, ...COLLECTION_TEST_ITEMS.slice(0, fillerCount)]
  }, [items])
  const totalPages = Math.max(1, Math.ceil(displayItems.length / itemsPerPage))
  const visibleItems = displayItems.slice(currentPage * itemsPerPage, currentPage * itemsPerPage + itemsPerPage)

  return (
    <main className="page">
      <section className="collection-shell">
        <div className="collection-header">
          <div className="collection-heading" />
          <div className="action-row collection-actions">
            <button className="ghost-button" type="button" onClick={onBackHome}>
              新しく綴る
            </button>
            <button className="secondary-button" type="button" onClick={onLogout}>
              ログアウト
            </button>
          </div>
        </div>

        {displayItems.length ? (
          <>
            <div className="collection-grid">
              {visibleItems.map((item, index) => {
                const absoluteIndex = currentPage * itemsPerPage + index
                return (
                  <button key={item.id} className="collection-card" type="button" onClick={() => setSelectedLetter(item)}>
                    <div className="collection-card-meta">
                      <span>{String(absoluteIndex + 1).padStart(2, '0')}</span>
                      <span>{new Date(item.created_at).toLocaleDateString('ja-JP')}</span>
                    </div>
                    <div className="collection-card-label">差出人</div>
                    <div className="collection-card-sender">{item.sender_name || '差出人未設定'}</div>
                    <div className="collection-card-divider" />
                    <div className="collection-card-received">受け取った日</div>
                    <div className="collection-card-date">{new Date(item.created_at).toLocaleDateString('ja-JP')}</div>
                  </button>
                )
              })}
            </div>

            {totalPages > 1 ? (
              <div className="collection-pagination">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
                  disabled={currentPage === 0}
                >
                  前へ
                </button>
                <div className="collection-page-numbers">
                  {Array.from({ length: totalPages }, (_, pageIndex) => (
                    <button
                      key={pageIndex}
                      type="button"
                      className={`collection-page-button ${currentPage === pageIndex ? 'active' : ''}`}
                      onClick={() => setCurrentPage(pageIndex)}
                    >
                      {pageIndex + 1}
                    </button>
                  ))}
                </div>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages - 1, page + 1))}
                  disabled={currentPage === totalPages - 1}
                >
                  次へ
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="collection-empty">
            <p>宝箱はまだ空です。</p>
            <p>受け取った手紙をしまうと、ここに並びます。</p>
          </div>
        )}
      </section>

      {selectedLetter ? (
        <div className="modal-backdrop">
          <div className="collection-reader-modal">
            <div
              className={`envelope-stage collection-envelope-stage ${openedLetterId === selectedLetter.id ? 'opened' : ''}`}
              style={{
                '--envelope': getDesignById(selectedLetter.design_id).envelope,
                '--accent': getDesignById(selectedLetter.design_id).accent,
              }}
            >
              <button
                className="envelope"
                onClick={() => setOpenedLetterId(selectedLetter.id)}
                type="button"
              >
                <div className="envelope-flap" />
                <div className="envelope-body">
                  <span>{openedLetterId === selectedLetter.id ? '手紙を読んでいます' : 'タップして開封'}</span>
                </div>
              </button>

              <article
                className={`letter-sheet simple-letter ${openedLetterId === selectedLetter.id ? 'visible' : ''}`}
                style={{
                  '--paper': getDesignById(selectedLetter.design_id).paper,
                  '--ink': getDesignById(selectedLetter.design_id).ink,
                  '--letter-font': getDesignById(selectedLetter.design_id).fontFamily,
                }}
              >
                <div
                  className="paper-texture"
                  style={{
                    '--texture-overlay': getDesignById(selectedLetter.design_id).textureOverlay,
                    '--texture-size': getDesignById(selectedLetter.design_id).textureSize,
                  }}
                />
                {selectedLetter.show_date ? (
                  <div className="letter-date">{new Date(selectedLetter.created_at).toLocaleDateString('ja-JP')}</div>
                ) : null}
                {selectedLetter.recipient_name ? <div className="letter-recipient">{selectedLetter.recipient_name}</div> : null}
                <AnimatedLetterMessage message={selectedLetter.message} active={openedLetterId === selectedLetter.id} />
                {selectedLetter.sender_name ? <div className="letter-sign">{selectedLetter.sender_name}</div> : null}
              </article>
            </div>

            <div className="action-row modal-actions">
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setSelectedLetter(null)
                  setOpenedLetterId('')
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function App() {
  const [draft, setDraft] = useState(defaultDraft)
  const [activePreviewPage, setActivePreviewPage] = useState(0)
  const [isSealed, setIsSealed] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [receivedLetter, setReceivedLetter] = useState(null)
  const [loadingLetter, setLoadingLetter] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [appScreen, setAppScreen] = useState('landing')
  const [sessionUser, setSessionUser] = useState(null)
  const [pendingTreasureLetter, setPendingTreasureLetter] = useState(null)
  const [authInitialMode, setAuthInitialMode] = useState('signup')
  const [globalToast, setGlobalToast] = useState('')

  useEffect(() => {
    seedLocalDemoData()

    const savedDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY)
    if (savedDraft) {
      try {
        setDraft({ ...defaultDraft, ...JSON.parse(savedDraft) })
      } catch {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY)
      }
    }

    const savedSession = readJsonStorage(SESSION_STORAGE_KEY, null)
    if (savedSession) {
      setSessionUser(savedSession)
    }
  }, [])

  useEffect(() => {
    if (!globalToast) return undefined
    const timer = window.setTimeout(() => setGlobalToast(''), 5000)
    return () => window.clearTimeout(timer)
  }, [globalToast])

  useEffect(() => {
    const loadLetter = async () => {
      const letterId = getLetterIdFromUrl()

      if (!letterId) {
        setLoadingLetter(false)
        return
      }

      if (!isSupabaseEnabled) {
        setLoadError('Supabase接続情報が未設定のため、手紙を取得できません。')
        setLoadingLetter(false)
        return
      }

      const { data, error } = await supabase
        .from('letters')
        .select('id, recipient_name, sender_name, message, design_id, show_date, created_at, opened_at, expires_at')
        .eq('id', letterId)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !data) {
        setLoadError('手紙が見つからないか、有効期限が切れています。')
        setLoadingLetter(false)
        return
      }

      setReceivedLetter(data)
      setLoadingLetter(false)
    }

    loadLetter()
  }, [])

  const handleSeal = async () => {
    if (!isSupabaseEnabled) {
      setSaveError('Supabase接続情報を設定すると保存できます。')
      return ''
    }

    setIsSaving(true)
    setSaveError('')

    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setDate(expiresAt.getDate() + 90)

    const payload = {
      recipient_name: draft.to.trim(),
      sender_name: draft.from.trim(),
      message: draft.message.trim(),
      design_id: draft.designId,
      show_date: draft.showDate,
      expires_at: expiresAt.toISOString(),
    }

    const { data, error } = await supabase.from('letters').insert(payload).select('id').single()

    if (error || !data) {
      setSaveError('保存に失敗しました。Supabase のテーブル設定を確認してください。')
      setIsSaving(false)
      return ''
    }

    setIsSealed(true)
    const nextShareUrl = buildShareUrl(data.id)
    setShareUrl(nextShareUrl)
    setCopied(false)
    setIsSaving(false)
    return nextShareUrl
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
  }

  const handleSaveDraft = () => {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
  }

  const resetDraft = () => {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY)
    setDraft(defaultDraft)
    setActivePreviewPage(0)
    setIsSealed(false)
    setShareUrl('')
    setCopied(false)
    setSaveError('')
  }

  const markOpened = async (letterId) => {
    if (!isSupabaseEnabled || !letterId || receivedLetter?.opened_at) return

    const openedAt = new Date().toISOString()
    setReceivedLetter((current) => (current ? { ...current, opened_at: openedAt } : current))
    await supabase.from('letters').update({ opened_at: openedAt }).eq('id', letterId)
  }

  const goHome = () => {
    window.history.replaceState({}, '', window.location.pathname)
    setReceivedLetter(null)
    setLoadError('')
    setLoadingLetter(false)
    setAppScreen('landing')
    setPendingTreasureLetter(null)
  }

  const handleStoreInTreasure = (letter) => {
    if (!sessionUser) {
      setPendingTreasureLetter(letter)
      setAuthInitialMode('signup')
      setReceivedLetter(null)
      setAppScreen('auth')
      return
    }

    saveTreasureLetter(letter)
    setGlobalToast('宝箱に入れました')
    goHome()
    setAppScreen('collection')
  }

  const handleAuthSuccess = (user) => {
    setSessionUser(user)

    if (pendingTreasureLetter) {
      saveTreasureLetter(pendingTreasureLetter)
      setPendingTreasureLetter(null)
      setGlobalToast('宝箱に入れました')
    }

    window.history.replaceState({}, '', window.location.pathname)
    setReceivedLetter(null)
    setLoadError('')
    setLoadingLetter(false)
    setAppScreen('collection')
  }

  const handleLogout = () => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    setSessionUser(null)
    setAppScreen('compose')
  }

  if (loadingLetter) {
    return (
      <main className="page">
        <section className="receiver-shell">
          <div className="status-card">手紙を読み込んでいます...</div>
        </section>
      </main>
    )
  }

  if (appScreen === 'auth') {
    return <AuthView initialMode={authInitialMode} onAuthSuccess={handleAuthSuccess} onBack={goHome} />
  }

  if (appScreen === 'collection') {
    return <CollectionView user={sessionUser} onBackHome={goHome} onLogout={handleLogout} />
  }

  if (receivedLetter) {
    return (
      <>
        {globalToast ? <div className="floating-toast">{globalToast}</div> : null}
        <LetterView
          letter={receivedLetter}
          onBackHome={goHome}
          onOpened={markOpened}
          onStoreInTreasure={handleStoreInTreasure}
        />
      </>
    )
  }

  if (loadError) {
    return (
      <main className="page">
        <section className="receiver-shell">
          <div className="status-card error">{loadError}</div>
          <div className="action-row">
            <button className="secondary-button" type="button" onClick={goHome}>
              トップへ戻る
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <>
      {globalToast ? <div className="floating-toast">{globalToast}</div> : null}
      {appScreen === 'landing' ? (
        <LandingView
          sessionUser={sessionUser}
          onLogin={() => {
            setAuthInitialMode('login')
            setAppScreen('auth')
          }}
          onCreateLetter={() => setAppScreen('compose')}
          onOpenCollection={() => setAppScreen('collection')}
        />
      ) : (
      <ComposerView
        copied={copied}
        draft={draft}
        handleCopy={handleCopy}
        handleSaveDraft={handleSaveDraft}
        handleSeal={handleSeal}
        isSaving={isSaving}
        activePreviewPage={activePreviewPage}
        resetDraft={resetDraft}
        saveError={saveError}
        setActivePreviewPage={setActivePreviewPage}
        setDraft={setDraft}
        shareUrl={shareUrl}
        sessionUser={sessionUser}
        onOpenAuth={() => {
          setAuthInitialMode('login')
          setAppScreen('auth')
        }}
        onOpenCollection={() => setAppScreen('collection')}
      />
      )}
    </>
  )
}

export default App
