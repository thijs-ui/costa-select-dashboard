export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      settings: {
        Row: {
          id: string
          key: string
          value: Json
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          updated_at?: string
        }
      }
      makelaars: {
        Row: {
          id: string
          naam: string
          actief: boolean
          created_at: string
        }
        Insert: {
          id?: string
          naam: string
          actief?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          naam?: string
          actief?: boolean
          created_at?: string
        }
      }
      deals: {
        Row: {
          id: string
          deal_nummer: number
          datum_passering: string
          regio: string
          type_deal: string
          bron: string
          aankoopprijs: number
          commissie_pct: number | null
          min_fee_toegepast: boolean
          bruto_commissie: number | null
          makelaar_id: string | null
          makelaar_pct: number
          makelaar_commissie: number | null
          partner_deal: boolean
          partner_naam: string | null
          partner_pct: number
          partner_commissie: number | null
          netto_commissie_cs: number | null
          notities: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          deal_nummer?: number
          datum_passering: string
          regio: string
          type_deal: string
          bron: string
          aankoopprijs: number
          commissie_pct?: number | null
          min_fee_toegepast?: boolean
          bruto_commissie?: number | null
          makelaar_id?: string | null
          makelaar_pct?: number
          makelaar_commissie?: number | null
          partner_deal?: boolean
          partner_naam?: string | null
          partner_pct?: number
          partner_commissie?: number | null
          netto_commissie_cs?: number | null
          notities?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          deal_nummer?: number
          datum_passering?: string
          regio?: string
          type_deal?: string
          bron?: string
          aankoopprijs?: number
          commissie_pct?: number | null
          min_fee_toegepast?: boolean
          bruto_commissie?: number | null
          makelaar_id?: string | null
          makelaar_pct?: number
          makelaar_commissie?: number | null
          partner_deal?: boolean
          partner_naam?: string | null
          partner_pct?: number
          partner_commissie?: number | null
          netto_commissie_cs?: number | null
          notities?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      kosten_categorieen: {
        Row: {
          id: string
          naam: string
          volgorde: number
          actief: boolean
        }
        Insert: {
          id?: string
          naam: string
          volgorde?: number
          actief?: boolean
        }
        Update: {
          id?: string
          naam?: string
          volgorde?: number
          actief?: boolean
        }
      }
      kosten_posten: {
        Row: {
          id: string
          categorie_id: string | null
          naam: string
          volgorde: number
          actief: boolean
        }
        Insert: {
          id?: string
          categorie_id?: string | null
          naam: string
          volgorde?: number
          actief?: boolean
        }
        Update: {
          id?: string
          categorie_id?: string | null
          naam?: string
          volgorde?: number
          actief?: boolean
        }
      }
      maandkosten: {
        Row: {
          id: string
          kosten_post_id: string | null
          jaar: number
          maand: number
          bedrag: number
        }
        Insert: {
          id?: string
          kosten_post_id?: string | null
          jaar: number
          maand: number
          bedrag?: number
        }
        Update: {
          id?: string
          kosten_post_id?: string | null
          jaar?: number
          maand?: number
          bedrag?: number
        }
      }
      afspraken: {
        Row: {
          id: string
          datum: string
          lead_naam: string
          bron: string | null
          regio: string | null
          makelaar_id: string | null
          type: string
          status: string
          resultaat: string | null
          deal_id: string | null
          notities: string | null
          pipedrive_activiteit_id: number | null
          created_at: string
        }
        Insert: {
          id?: string
          datum: string
          lead_naam: string
          bron?: string | null
          regio?: string | null
          makelaar_id?: string | null
          type?: string
          status?: string
          resultaat?: string | null
          deal_id?: string | null
          notities?: string | null
          pipedrive_activiteit_id?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          datum?: string
          lead_naam?: string
          bron?: string | null
          regio?: string | null
          makelaar_id?: string | null
          type?: string
          status?: string
          resultaat?: string | null
          deal_id?: string | null
          notities?: string | null
          pipedrive_activiteit_id?: number | null
          created_at?: string
        }
      }
      bonnen: {
        Row: {
          id: string
          datum: string
          bedrag: number
          btw_bedrag: number | null
          omschrijving: string | null
          categorie_id: string | null
          kosten_post_id: string | null
          bestandsnaam: string
          bestandspad: string
          bestandstype: string | null
          bestandsgrootte: number | null
          created_at: string
        }
        Insert: {
          id?: string
          datum: string
          bedrag: number
          btw_bedrag?: number | null
          omschrijving?: string | null
          categorie_id?: string | null
          kosten_post_id?: string | null
          bestandsnaam: string
          bestandspad: string
          bestandstype?: string | null
          bestandsgrootte?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          datum?: string
          bedrag?: number
          btw_bedrag?: number | null
          omschrijving?: string | null
          categorie_id?: string | null
          kosten_post_id?: string | null
          bestandsnaam?: string
          bestandspad?: string
          bestandstype?: string | null
          bestandsgrootte?: number | null
          created_at?: string
        }
      }
      commissie_uitbetalingen: {
        Row: {
          id: string
          deal_id: string | null
          makelaar_id: string | null
          bedrag: number
          status: string
          uitbetaald_op: string | null
          created_at: string
        }
        Insert: {
          id?: string
          deal_id?: string | null
          makelaar_id?: string | null
          bedrag: number
          status?: string
          uitbetaald_op?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          deal_id?: string | null
          makelaar_id?: string | null
          bedrag?: number
          status?: string
          uitbetaald_op?: string | null
          created_at?: string
        }
      }
    }
  }
}
