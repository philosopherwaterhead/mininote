const encoder = new TextEncoder()
const decoder = new TextDecoder()

export type EncryptedData = {
  salt: string
  iv: string
  ciphertext: string
}

//
// ArrayBuffer → base64
//

function toBase64(
  buffer: ArrayBuffer
): string {
  const bytes =
    new Uint8Array(buffer)

  let binary = ""

  for (const b of bytes) {
    binary += String.fromCharCode(b)
  }

  return btoa(binary)
}

//
// base64 → Uint8Array
//

function fromBase64(
  base64: string
): Uint8Array {
  const binary = atob(base64)

  const bytes = new Uint8Array(
    binary.length
  )

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {
    bytes[i] =
      binary.charCodeAt(i)
  }

  return bytes
}

//
// password + salt → AES key
//

async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const passwordBytes =
    encoder.encode(password)

  const baseKey =
    await crypto.subtle.importKey(
      "raw",
      passwordBytes,
      "PBKDF2",
      false,
      ["deriveKey"]
    )

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",

      salt: salt.slice(),

      iterations: 100000,

      hash: "SHA-256",
    },

    baseKey,

    {
      name: "AES-GCM",

      length: 256,
    },

    false,

    ["encrypt", "decrypt"]
  )
}

//
// encrypt
//

export async function encryptString(
  plaintext: string,
  password: string
): Promise<EncryptedData> {
  // salt
  const salt =
    crypto.getRandomValues(
      new Uint8Array(16)
    )

  // iv
  const iv =
    crypto.getRandomValues(
      new Uint8Array(12)
    )

  // key
  const key = await deriveKey(
    password,
    salt
  )

  // text → bytes
  const plaintextBytes =
    encoder.encode(plaintext)

  // encrypt
  const ciphertext =
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv.slice(),
      },

      key,

      plaintextBytes
    )

  return {
    salt: toBase64(
      salt.slice().buffer
    ),

    iv: toBase64(
      iv.slice().buffer
    ),

    ciphertext:
      toBase64(ciphertext),
  }
}

//
// decrypt
//

export async function decryptString(
  encrypted: EncryptedData,
  password: string
): Promise<string> {
  const salt = fromBase64(
    encrypted.salt
  )

  const iv = fromBase64(
    encrypted.iv
  )

  const ciphertext =
    fromBase64(
      encrypted.ciphertext
    )

  // 同じ鍵を再生成
  const key = await deriveKey(
    password,
    salt
  )

  // decrypt
  const plaintextBuffer =
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv.slice(),
      },

      key,

      ciphertext.slice()
      .buffer
    )

  return decoder.decode(
    plaintextBuffer
  )
}