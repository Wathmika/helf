import { Camera, UserRound } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { Spinner } from "@/components/Spinner"
import { Switch } from "@/components/Switch"
import { useUpdatePerson, type PersonWithChildren } from "@/hooks/usePerson"
import { supabase } from "@/lib/supabase"

const BUCKET = "person-photos"
const SIGNED_URL_TTL_SECONDS = 300

function cropToSquare(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const size = Math.min(img.width, img.height)
      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Canvas unsupported"))
        return
      }
      const sx = (img.width - size) / 2
      const sy = (img.height - size) / 2
      ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size)
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))), "image/jpeg", 0.9)
      URL.revokeObjectURL(img.src)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export function PhotoUpload({ person }: { person: PersonWithChildren }) {
  const { t } = useTranslation()
  const updatePerson = useUpdatePerson(person.id)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    if (!person.photo_path) {
      setSignedUrl(null)
      return
    }
    void supabase.storage
      .from(BUCKET)
      .createSignedUrl(person.photo_path, SIGNED_URL_TTL_SECONDS)
      .then(({ data }) => {
        if (active) setSignedUrl(data?.signedUrl ?? null)
      })
    return () => {
      active = false
    }
  }, [person.photo_path])

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setUploading(true)
    setError(false)
    try {
      const blob = await cropToSquare(file)
      const path = `${person.id}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: "image/jpeg", upsert: true })
      if (uploadError) throw uploadError
      updatePerson.mutate({ photo_path: path })
    } catch {
      setError(true)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-brand-700">
        {uploading ? (
          <Spinner />
        ) : signedUrl ? (
          <img src={signedUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <UserRound size={32} />
        )}
      </div>

      <div className="flex-1">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <Camera size={16} />
          {person.photo_path ? t("profile.photo.changeCta") : t("profile.photo.uploadCta")}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
        <p className="mt-1 text-xs text-gray-400">{t("profile.photo.hint")}</p>
        {error && <p className="mt-1 text-xs text-danger-600">{t("profile.photo.errorUpload")}</p>}

        <div className="mt-2 flex items-center gap-2">
          <Switch checked={person.show_photo} onChange={(next) => updatePerson.mutate({ show_photo: next })} />
          <span className="text-xs text-gray-500">{t("common.showOnScan")}</span>
        </div>
      </div>
    </div>
  )
}
