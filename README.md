# coloncolon

##mix of HTMX features (HDA) and SPA

just a proof of concept

this is a framework based on attributes. the attributes are defined with a colon prefix (:). it uses a hidden iframe (like htmz) to load standard documents like ```<a href>``` and ```<frame action>``` and then uses onload to get the loaded content. in that way it uses the same mechanism that the browser without emulations like fetch.

available attributes:

- :var defines a reactive variable
```html
    <input type="hidden" :var="name" value="john" >
```
- :bind uses a defined reactive variable
```html
    <div :bind="name"></div>
```
- :each loop over an array

    it assumes that the reactive variable contains a json value as a string. Use :bind to bind a property of every item of the array.
```html
    <input type="hidden" :var="products" value='[{"id":1, "name":"Samarreta", "price":20.50}, {"id":2, "name":"Pantalons", "price":45.00}, {"id":3, "name":"Sabates", "price":75.99}]'>
    <div class="section" >
        <h2>Products in list:</h2>
        <div :each="products"> 
            <article>
                <p>ID: <span :bind="id"></span></p>  
                <p>Name: <span :bind="name"></span></p> 
                <p>Price: <span :bind="price"></span>€</p> 
            </article>
        </div>
    </div>
```
- :include loads a partial html content and includes it in the current element
```html
    <div :include="nav.html"></div>
```
- :stream receives partial html content as a streaming source
```html
    <div :stream="foo.txt"></div>
```
- :target defines the element (or elements) which children will be replaced with a partial html content load
```html
    <p><a href="nav.html?bloc" :target="#bloc,#bloc2" :transition>Carrega bloc 4</a></p>
    <form method="POST" action="foo.html" :target="#bloc"></form>
    <div id="bloc"></div>
    <div id="bloc2"></div>
```
- :poll defines a repeating query every x ms.
```html
    <div :include="foo.txt" :poll="2000" :on-click="this.removeAttribute(':poll')" ></div>
```
- :on-[eventname] defines a event handler

    look the previous example. this is mapped to the element that defines the event.

- :transition states that there must be a smooth transition to the changing spaces because of new or removed content as a result of a partial load.

- :loader states that there must be a loader indicator while the partial load is being received.
```html
    <p><a href="contacto.html" :target="#bloc" :transition :loader>Carrega bloc 2</a></p>
```
    CSS defined for this:
```css
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
```
- :lazy waits until the element gets into the view port to activate the :include attribute
