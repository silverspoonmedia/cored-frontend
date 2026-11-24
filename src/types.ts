export type MenuNodeType = 'h' | 'p' | 'c'

export interface NavNode {
  id: string
  name: string
  icon?: string | null
  route?: string | null
  hash?: string | null
  type: MenuNodeType
  order: number
  children: NavNode[]
}

export type ThemeMode = 'light' | 'dark' | 'auto'

export type Locale = 'en' | 'id'
