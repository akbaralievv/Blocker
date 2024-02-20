import {
  getRulesEnabledState,
  enableRulesForCurrentPage,
  disableRulesForCurrentPage,
} from '../scripts/background.js';

const wrapperPopup = document.querySelector('.wrapper');
const button = document.getElementById('check-5');
const domainText = document.querySelector('.domain');
const checkbox = document.querySelector('#tmp-28');
const countActions = document.querySelector('#countActions');
const addToWhitelist = document.getElementById('addToWhitelist');
const clearWhitelist = document.getElementById('clearWhitelist');
const whitelistInput = document.getElementById('whitelistDomains');
const blockAds_title = document.querySelector('.blockAds_title');

function saveCheckboxState(checked) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0].url && tabs[0].url.startsWith('http')) {
      const url = tabs[0].url;
      const cookieName = 'checked';

      if (!url) {
        console.log(chrome.runtime.lastError.message);
        return;
      }

      chrome.cookies.set({
        url: url,
        name: cookieName,
        value: checked ? 'true' : 'false',
      });
    }
  });
}

function getCheckboxState(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const url = tabs[0]?.url;
    if (url && url.startsWith('http')) {
      chrome.cookies.get({ url: url, name: 'checked' }, function (cookie) {
        if (cookie && cookie.value) {
          if (cookie.value === 'true') {
            callback(true);
          } else if (cookie.value === 'false') {
            callback(false);
          }
        }
      });
    }
  });
}

function updateCheckboxState(isChecked) {
  checkbox.checked = isChecked;
}

async function updateButtonState() {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isEnabled = await getRulesEnabledState();
  if (tab?.url && tab.url.startsWith('http')) {
    let url = new URL(tab.url);
    getFromStorage('whitelist', function (result) {
      const whitelist = result.whitelist || [];
      if (whitelist.length > 0) {
        const isWhitelist = whitelist.find((white) => url.hostname.includes(white));
        if (isWhitelist) {
          document.querySelector('.blockAds').style.display = 'none';
          document.querySelector('.footer').style.display = 'none';
          document.querySelector('.pageUpdate').style.display = 'none';
          document.querySelector('.whitelist_img').style.display = 'flex';
          disableRulesForCurrentPage(false);
          wrapperPopup.classList.add('disabled');
          button.checked = false;
          blockAds_title.innerHTML = 'Ad blocking is turned off';
        } else {
          document.querySelector('.blockAds').style.display = 'flex';
          document.querySelector('.footer').style.display = 'flex';
          document.querySelector('.pageUpdate').style.display = 'block';
          document.querySelector('.whitelist_img').style.display = 'none';
          if (!isEnabled) {
            wrapperPopup.classList.add('disabled');
            button.checked = false;
            blockAds_title.innerHTML = 'Ad blocking is turned off';
            chrome.storage.sync.set({ isCheckedToggle: false });
          } else {
            wrapperPopup.classList.remove('disabled');
            button.checked = true;
            blockAds_title.innerHTML = 'Blocking on this page is enabled';
            chrome.storage.sync.set({ isCheckedToggle: true });
          }
        }
      } else {
        document.querySelector('.blockAds').style.display = 'flex';
        document.querySelector('.footer').style.display = 'flex';
        document.querySelector('.pageUpdate').style.display = 'block';
        document.querySelector('.whitelist_img').style.display = 'none';
        if (!isEnabled) {
          wrapperPopup.classList.add('disabled');
          button.checked = false;
          blockAds_title.innerHTML = 'Ad blocking is turned off';
          chrome.storage.sync.set({ isCheckedToggle: false });
        } else {
          wrapperPopup.classList.remove('disabled');
          button.checked = true;
          blockAds_title.innerHTML = 'Blocking on this page is enabled';
          chrome.storage.sync.set({ isCheckedToggle: true });
        }
      }
    });
  }
}

button.addEventListener('click', async () => {
  const isEnabled = await getRulesEnabledState();
  if (isEnabled) {
    await disableRulesForCurrentPage(checkbox.checked ? true : false);
  } else {
    await enableRulesForCurrentPage(checkbox.checked ? true : false);
  }
  updateButtonState();
});

checkbox.addEventListener('click', async () => {
  saveCheckboxState(checkbox.checked);
});

updateButtonState();

async function initPopupWindow() {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    try {
      let url = new URL(tab.url);
      domainText.innerHTML = url.hostname;
    } catch {}
  }
}
initPopupWindow();

getCheckboxState(function (isChecked) {
  updateCheckboxState(isChecked);
});

chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  chrome.action.getBadgeText({ tabId: tabs[0].id }, (result) => {
    if (result) {
      countActions.innerHTML = result;
    } else {
      countActions.innerHTML = '0';
    }
  });
});

function saveToStorage(data) {
  chrome.storage.sync.set(data);
}

function getFromStorage(keys, callback) {
  chrome.storage.sync.get(keys, function (result) {
    callback(result);
  });
}
function clearWhitelistFunc() {
  whitelistInput.value = '';
  chrome.storage.sync.set({ whitelist: [] });
  updateButtonState();
}

addToWhitelist.addEventListener('click', function () {
  const domainsText = document.getElementById('whitelistDomains').value;
  const domains = domainsText
    .split(',')
    .map((domain) => domain.trim())
    .filter((domain) => domain.length);

  saveToStorage({ whitelist: domains });
});

clearWhitelist.addEventListener('click', clearWhitelistFunc);

function loadWhitelistDomains() {
  getFromStorage(['whitelist'], function (result) {
    if (result.whitelist) {
      const domainsText = result.whitelist.join(', ');
      document.getElementById('whitelistDomains').value = domainsText;
    }
  });
}

loadWhitelistDomains();

const checkContentScript = (tabId) => {
  chrome.tabs.sendMessage(tabId, { type: 'CHECK_READY' }, function (response) {
    if (chrome.runtime.lastError) {
      console.log('Content script not ready or not present:', chrome.runtime.lastError.message);
      return;
    }
    if (!response) {
      console.log('No response from content script');
      return;
    }
    if (response.isReady) {
      console.log('Blocking');
    }
  });
};

chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  if (tabs[0]?.url?.startsWith('http')) {
    checkContentScript(tabs[0].id);
  }
});
