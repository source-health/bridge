import { Auth } from '../../src'

/**
 * Inject some JSON into a container that exists on the page
 */
export function replaceContent(data: Record<string, unknown>, selector: string = '#content'): void {
  const contentDiv = document.querySelector(selector)
  if (!contentDiv) {
    console.error(`Could not find ${selector} to replace the content`)
    return
  }

  contentDiv.innerHTML = `<pre class='data'>${JSON.stringify(data, null, 2)}</pre>`
}

export interface IframeData {
  iframe: Window
  url: URL
}

export function createIFrame(
  iframePath: string,
  guestName: string,
  containerSelector: string = '#placeholder',
): IframeData {
  const urlParams = new URLSearchParams(window.location.search)

  // Default iframe base url is same as the parent
  const iframeOrigin = window.location.protocol + '//' + window.location.host
  const iframeUrl = new URL(iframeOrigin + '/' + iframePath)
  iframeUrl.searchParams.append('guestName', guestName)

  // Pass through the query params from the host application
  for (const entry of urlParams.entries()) {
    iframeUrl.searchParams.append(entry[0], entry[1])
  }

  const iframe = document.createElement('iframe')
  iframe.className = guestName
  iframe.id = 'iframe1'
  iframe.src = iframeUrl.href
  iframe.width = '100%'
  iframe.height = '400px'
  iframe.sandbox.add('allow-forms', 'allow-popups', 'allow-scripts', 'allow-same-origin')
  const container = document.querySelector(containerSelector)
  if (!container) {
    console.error(`Could not find container ${containerSelector}`)
    throw new Error(`Could not find container ${containerSelector}`)
  }
  container.appendChild(iframe)
  if (!iframe.contentWindow) {
    throw new Error('iframe has no contentwindow, thats weird')
  }
  return {
    iframe: iframe.contentWindow,
    url: iframeUrl,
  }
}

export async function getToken(): Promise<Auth> {
  return Promise.resolve({
    token:
      'eyJhbGciOiJFZERTQSIsImNydiI6IkVkMjU1MTkiLCJraWQiOiJhcHBfMTIzIn0.eyJwdXJwb3NlIjoidmVyaWZpY2F0aW9uIiwiYXBwIjoiYXBwXzEyMyIsInVzciI6InVzcl8xMjMiLCJpYXQiOjE2NDE1MDExOTQsImlzcyI6InNvdXJjZWhlYWx0aCIsImV4cCI6MTY0MTUwMjA5NH0.3oYyGr4XHSuZENF121lYVIumI32ZdRH6RV5b0emG8p_yHuPm-TL1dSU4Y3v6OYnzPs0qi2H8sTUCruXNg4Z0CA',
    expiresAt: new Date('2022-01-06T20:48:14.919Z'),
  })
}
