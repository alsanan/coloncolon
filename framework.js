// considerar llamarlo coloncolon :: o colondash :-

window._plugins = {};

// framework.js - _dataStore (VERSió original i més senzilla)
window._dataStore = {
    _values: {},
    _subscribers: {},

    get: function(varName) {
        return this._values[varName];
    },

    set: function(varName, value) {
        const oldValue = this._values[varName];
        if (oldValue === value) return;

        this._values[varName] = value;
        if (this._subscribers[varName]) {
            this._subscribers[varName].forEach(callback => callback(value));
        }
    },

    subscribe: function(varName, callback) {
        if (!this._subscribers[varName]) {
            this._subscribers[varName] = [];
        }
        this._subscribers[varName].push(callback);
    },

    unsubscribe: function(varName, callback) {
        if (this._subscribers[varName]) {
            this._subscribers[varName] = this._subscribers[varName].filter(cb => cb !== callback);
        }
    }
};

// Funció parseValue (la que ja tenies)
const parseValue = (val) => {
    if (typeof val !== 'string' || val.trim() === '') return val;
    try {
        const parsed = JSON.parse(val);
        if (typeof parsed === 'object' && parsed !== null) {
            return parsed;
        }
    } catch (e) {}
    if (!isNaN(val) && val !== '') {
        return Number(val);
    }
    return val;
};

// Funció per trobar l'objecte d'scope més proper
// (Aquesta segueix sent crucial per a :bind dins de :each)
function findScopeObject(el) {
    let current = el;
    while (current) {
        if (current._scopeObject) {
            return current._scopeObject;
        }
        current = current.parentElement;
    }
    return null;
}

// Funcions per accedir/establir propietats amb camí dins d'un objecte (necessàries per getPropByPath, setPropByPath)
function getPropByPath(obj, path) {
    return path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
}

function setPropByPath(obj, path, value) {
    let parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        let part = parts[i];
        if (!current[part] || typeof current[part] !== 'object') {
            current[part] = {};
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
}

// ... (resta del teu framework.js)

const registerPlugin= (attr, handler) => window._plugins[attr] = handler;

const errorHtml= url=>`<div style="color:red">⚠️ Error carregant <code>${url}</code></div>`;

const findTarget= name=>document.querySelector(`#${name}, [name="${name}"]`);

function highlight(el) {
  el.style.transition = 'background-color 0.3s ease-out';
  const backup= el.style.backgroundColor;
  el.style.backgroundColor = '#fd0';
  setTimeout(() => { el.style.backgroundColor = backup; }, 200);
}

function setInnerWithTransition(el, updateFn) {
  if (document.startViewTransition && el.hasAttribute(':transition')) {
    document.startViewTransition(() =>updateFn(el));
  } else updateFn(el);
}

function animateHeightChange(target, wrapper, trigger) {
	const anim=trigger.hasAttribute(':transition');
  // 🔒 Ocultem el wrapper però el col·loquem al lloc real
  let oldHeight, newHeight;
  if (anim) {
		wrapper.style.position = 'static';
		wrapper.style.visibility = 'hidden';
		oldHeight = target.offsetHeight;
	}
	target.innerHTML = '';
  target.appendChild(wrapper); // ✅ Només 1 appendChild

	if (anim) {
		// 🧮 Mesura de la nova alçada
		newHeight = wrapper.scrollHeight;
		// 🌀 Prepara animació del contenidor
		target.style.height = oldHeight + 'px';
		target.style.transition = 'height 0.2s ease';
	}
	
  requestAnimationFrame(() => {
    if (anim) target.style.height = newHeight + 'px';

    setTimeout(() => {
      // ✅ Mostrem el wrapper ara que la transició ha acabat
      if (anim) {
				wrapper.style.position = '';
				wrapper.style.visibility = '';
				// 🔓 Alliberem height fixa
				target.style.height = '';
				highlight(wrapper);
			}
    }, 200); // mateix temps que la transició
  });
}

function showLoaderForTarget(el) {
  const selector = el.getAttribute(':target');
  if (!selector) return;
  const targets = document.querySelectorAll(selector);
  targets.forEach(target => target.classList.add('loader'))
}

function handler(ev) {
window.DEBUG && console.log(ev.target.tagName,ev.type,['A','FORM','BUTTON'].includes(ev.target.tagName),ev.target.hasAttribute(':loader'))
	if (ev.target.hasAttribute(':loader') && ['A','FORM','BUTTON'].includes(ev.target.tagName)) {
		window._lastTrigger = ev.target;
		showLoaderForTarget(ev.target)
	}
}


////////////////////////////////
/// PLUGINS ////////////////////

registerPlugin(':websocket ', el => {}) //pendent. connecta amb el servidor i envia i rep html que reflecteix en l'element


// framework.js (afegeix-ho a la secció de PLUGINS, abans de :bind)
// framework.js - Plugin :var (revisat)

registerPlugin(':var', el => {
    const varName = el.getAttribute(':var');
    if (!varName) return;

    // 1. Inicialitzar la variable en _dataStore si no existeix
    if (typeof window._dataStore.get(varName) === 'undefined') {
        let initialValue;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
            initialValue = el.value;
        } else {
            initialValue = el.textContent;
        }
        window._dataStore.set(varName, parseValue(initialValue));
    } else {
        // Si la variable ja existeix, i l'element és un input, assegura que l'input tingui el valor actual del dataStore
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
             const currentValue = window._dataStore.get(varName);
             el.value = (typeof currentValue === 'object' && currentValue !== null) ? JSON.stringify(currentValue) : String(currentValue || '');
        }
    }

    // 2. Actuar com a publicador: afegir listener per a elements d'entrada
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        if (!el._varInputListener) {
            el._varInputListener = () => {
                window._dataStore.set(varName, parseValue(el.value));
            };
            el.addEventListener('input', el._varInputListener);
        }
    }
});

// ... (codi de :bind, que ja rep el valor correcte de _dataStore) ...
// framework.js - Plugin :bind (revisat i simplificat)

registerPlugin(':bind', el => {
    const varName = el.getAttribute(':bind'); // Ara serà "id", "name", "price"
    if (!varName) return;

    // Trobar l'objecte d'scope més proper
    const scopeObj = findScopeObject(el);

    // La funció que s'executarà per actualitzar l'element
    const updateElement = () => {
        let valueToDisplay;
        if (scopeObj) { // Si estem dins d'un scope (:each)
            valueToDisplay = getPropByPath(scopeObj, varName); // Obtenim la propietat de l'objecte de l'ítem
        } else { // Si no hi ha scope, utilitzem el _dataStore global
            valueToDisplay = window._dataStore.get(varName);
        }

        const displayValue = (typeof valueToDisplay === 'object' && valueToDisplay !== null) ? JSON.stringify(valueToDisplay) : String(valueToDisplay || '');

        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
            el.value = displayValue;
        } else {
            el.textContent = displayValue;
        }
    };

    // 1. Inicialitzar el contingut amb el valor actual
    updateElement();

    // 2. Subscriure l'element als canvis.
    // Només els binds globals se subscriuen directament al _dataStore.
    // Els binds dins de :each s'actualitzaran quan el :each pare es re-renderitzi.
    // Si la reactivitat d'un camp dins de l'ítem és modificada per un onclick,
    // s'haurà de forçar la notificació de l'array pare.
    if (!scopeObj) { // Només subscriure si no estem dins d'un scope d'ítem (variable global)
        const subscriptionKey = `${varName}-${el.id || el.dataset.fref || Math.random()}`;
        if (!el._bindSubscriber || el._bindSubscriberKey !== subscriptionKey) {
            if (el._bindSubscriber && el._bindSubscriberKey) {
                window._dataStore.unsubscribe(varName, el._bindSubscriber);
            }
            el._bindSubscriber = updateElement;
            el._bindSubscriberKey = subscriptionKey;
            window._dataStore.subscribe(varName, el._bindSubscriber);
        }
    }
    // NOTA: Si necessitem reactivitat immediata per a un input dins d'un :each (amb un onclick, per exemple)
    // que modifiqui directament l'objecte de l'ítem, haurem de cridar manualment
    // window._dataStore.set(ARRAY_PARENT_NAME, window._dataStore.get(ARRAY_PARENT_NAME));
    // per forçar la re-renderització del :each.
});

// framework.js - Plugin :each (revisat i simplificat)

registerPlugin(':each', el => {
    const arrayVarName = el.getAttribute(':each'); // Ara només serà "products"
    if (!arrayVarName) return;

    // Guardar el contingut original de l'element com a plantilla
    const templateContent = el.innerHTML;
    el.innerHTML = ''; // Buidar el contingut original

    // Funció per re-renderitzar tota la llista
    const renderList = (newArray) => {
        el.innerHTML = ''; // Buidar l'element per a la nova renderització
        // Desubscriure tots els listeners dels elements antics abans de buidar
        // (Això és important per evitar memory leaks, però complex sense un patró de neteja explícit)
        // Per ara, assumim que la gestió de memòria del navegador és suficient per a aplicacions petites.

        if (!Array.isArray(newArray)) {
            console.warn(`Variable ${arrayVarName} no és un array per a :each.`, newArray);
            return;
        }

        newArray.forEach((itemData, index) => {
            const itemWrapper = document.createElement('div');
            // IMPORTANT: Clonem la plantilla amb deep copy per assegurar que els elements interns són nous.
            // Si usem innerHTML, ja es fa una còpia implícita.
            itemWrapper.innerHTML = templateContent;

            // AFEGIM LA REFERÈNCIA A L'OBJECTE DE DADES A L'ELEMENT CLONAT
            itemWrapper._scopeObject = itemData; // LA CLAU DE LA SIMPLIFICACIÓ

            // Aplicar els plugins a tots els nodes fills del nou element
            itemWrapper.querySelectorAll('*').forEach(child => {
                Object.keys(window._plugins).forEach(attr => {
                    if (child.hasAttribute(attr)) {
                        window._plugins[attr](child); // Crida els plugins sense passar context (el busquen)
                    }
                });
            });

            el.appendChild(itemWrapper);
        });
    };

    // 1. Inicialitzar la llista
    const initialArray = window._dataStore.get(arrayVarName);
    renderList(initialArray);

    // 2. Subscriure's als canvis de la variable de l'array per re-renderitzar
    if (!el._eachSubscriber) {
        el._eachSubscriber = renderList;
        window._dataStore.subscribe(arrayVarName, el._eachSubscriber);
    }
});


/* primer versió funcional, basada en window._appState
registerPlugin(':var', el => {
  const varName = el.getAttribute(':var');
  if (!varName) return;

  // Inicialitza l'estat si no existeix
  window._appState[varName] = window._appState[varName] || el.textContent; // O un valor per defecte

  // Actualitza el text de l'element quan la variable canvia
  // (Això necessitaria un sistema de "observables" o "reactividad" molt bàsic)
  Object.defineProperty(window._appState, varName, {
    set: function(value) {
      this._value = value;
      el.textContent = value; // Actualitza el DOM
    },
    get: function() {
      return this._value;
    }
  });

  // Per a inputs
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    el.addEventListener('input', () => {
      window._appState[varName] = el.value; // Actualitza l'estat quan l'usuari escriu
    });
  }
});*/


registerPlugin(':include', el => {
  const url = el.getAttribute(':include');
  if (!url || el.hasAttribute(':loaded')) return;
 
  const loadNow = () => {
    el.setAttribute(':loaded', '');
    fetch(url)
      .then(res => res.ok ? res.text() : Promise.reject(res.status))
      .then(html => {
				const wrapper = document.createElement('div');
				wrapper.innerHTML = html;

				if (el.hasAttribute(':transition') && 'animateHeightChange' in window) animateHeightChange(el, wrapper);
				else {
					el.innerHTML = '';
					el.appendChild(wrapper);
				}
				if (el.hasAttribute(':transition')) highlight(wrapper);

				if (el.hasAttribute('inert')) el.removeAttribute('inert');
      })
      .catch(() => el.innerHTML = errorHtml(url));
  };

  if (el.hasAttribute(':lazy')) {
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        io.disconnect();
        loadNow();
      }
    });
    io.observe(el);
  } else {
    loadNow();
  }
});

registerPlugin(':stream', el => {
  const url = el.getAttribute(':stream');
  if (!url || el.hasAttribute(':loaded')) return;
  el.setAttribute(':loaded', '');
  fetch(url)
    .then(async res => {
      if (!res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) el.insertAdjacentHTML('beforeend', decoder.decode(value));
      }
      highlight(el);
    })
    .catch(() => el.innerHTML = errorHtml(url));
});

registerPlugin(':target', el => {
  const selector = el.getAttribute(':target');
  if (!selector) return;
  el.setAttribute('target', '_shared');
  window._lastTrigger = el; // 📌 guarda qui llança la càrrega
});

// Extensio: plugin :poll
registerPlugin(':poll', el => {
  const ms = parseInt(el.getAttribute(':poll'), 10);
  if (!ms || el.hasAttribute(':polling')) return;

  el.setAttribute(':polling', ''); // marca com actiu

  const poll = async () => {
    if (!el.hasAttribute(':poll')) {
      el.removeAttribute(':polling');
      return; // s'ha eliminat
    }
    if (el.hasAttribute(':include')) {
      el.removeAttribute(':loaded');
      applyPlugins(el); // recarrega
    }
    setTimeout(poll, ms);
  };
  poll();
});

registerPlugin(':on', el => {
  if (!el.myevents) el.myevents = {};

  // Iterem tots els atributs de l'element
  for (const attr of el.getAttributeNames()) {
    if (!attr.startsWith(':on-')) continue;

    const event = attr.slice(4); // ex: ':on-click' → 'click'
    const code = el.getAttribute(attr);
    const key = `:on-${event}`;

    if (!event || !code || el.myevents[key]) continue;

    const handler = e => {
      try {
        const fn = new Function('event', code);
        fn.call(el, e); // 'this' és l'element
      } catch (err) {
        console.error(`Error a ${key}`, err);
      }
    };

    el.addEventListener(event, handler);
    el.myevents[key] = handler;
  }
});



////////////////////////////

// Escaneig inicial i observació del DOM
function applyPlugins(el = document.body) {
  for (const [key, plugin] of Object.entries(window._plugins || {})) {
    const selector = `[${key}]`.replace(/(:)/g, '\\$1');

    // Aplica el plugin si l'element actual el té
    if (el.hasAttribute?.(key)) plugin(el);

    // Aplica als descendents que tenen l'atribut
    el.querySelectorAll(selector).forEach(node => plugin(node));
  }

  // A més, sempre aplica el plugin ':on' (perquè no es pot seleccionar amb wildcard)
  if (window._plugins[':on']) window._plugins[':on'](el);
  el.querySelectorAll('*').forEach(child => {
    window._plugins[':on'](child);
  });
}


// Observador per canvis dinàmics
const observer = new MutationObserver(mutations => {
  for (const m of mutations) {
    m.addedNodes.forEach(n => {
      if (n.nodeType === 1) applyPlugins(n);
    });
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// Plugins globals
applyPlugins();

document.addEventListener("click", handler)
document.addEventListener("submit", handler)

window._sharedFrame = window._sharedFrame || (() => {
  const iframe = document.createElement('iframe');
  iframe.name = '_shared';
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  return iframe;
})();
window._sharedFrame.onload = () => {
  const el = window._lastTrigger;
  if (!el) return;
  const selector = el.getAttribute(':target');
  const doc = window._sharedFrame.contentDocument;
  if (!doc || !doc.body || !selector) return;
  requestAnimationFrame(() => {
    const newNodes = [...doc.body.childNodes];
    document.querySelectorAll(selector).forEach(target => {
      const wrapper = document.createElement('div');
      wrapper.append(...newNodes.map(n => n.cloneNode(true)));
      setInnerWithTransition(target, t => animateHeightChange(t, wrapper, el));
      target.classList.remove('loader');
    });
    window._lastTrigger = null;
  });
};

window._lastTrigger = null;

if (document.startViewTransition) {
	const style = document.createElement('style');
	style.textContent = `
		::view-transition-old(root),
		::view-transition-new(root) {
			animation-duration: 1s;
		}
		.loader:before {
		  content:"";
		  display:block;
			width: 20px;
			height: 20px;
			border: 3px solid #ccc;
			border-top: 3px solid #666;
			border-radius: 50%;
			animation: spin 0.8s linear infinite;
			margin: 1em auto;
		}
		@keyframes spin { to { transform: rotate(360deg); } }
	`;
	document.head.appendChild(style);
}
