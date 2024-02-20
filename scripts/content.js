document.addEventListener('DOMContentLoaded', function () {
  chrome.storage.sync.get('isCheckedToggle', function (result) {
    const isChecked = result.isCheckedToggle;
    if (isChecked) {
      removeAds();
    }
  });
});

function removeAds() {
  const adElements = document.querySelectorAll('.ad-class, .ad-banner, iframe[src*="adserver"]');
  adElements.forEach(function (el) {
    el.remove();
  });

  const style = document.createElement('style');
  style.innerHTML = `
        .ad-class, .ad-banner, iframe[src*="adserver"] {
            display: none !important;
        }
    `;
  if (adElements.length > 0) {
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
      if (request.type === 'CHECK_READY') {
        sendResponse({ isReady: true });
      }
    });
  }
  document.head.appendChild(style);
}
