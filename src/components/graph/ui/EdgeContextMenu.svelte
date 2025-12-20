<script lang="ts">  
    export let onClick: () => void;
    export let box_id: string|null;
  
  
    let local_id: string = box_id ?? ""; 
  
    // pos is cursor position when right click occur
    let pos = { x: 0, y: 0 }
    // menu is dimension (height and width) of context menu
    let menu = { h: 0, y: 0 }
    // browser/window dimension (height and width)
    let browser = { h: 0, y: 0 }
    let showMenu = false;
  
  
    function rightClickContextMenu(e){
        showMenu = true
        browser = {
            w: window.innerWidth,
            h: window.innerHeight
        };
        pos = {
            x: e.clientX,
            y: e.clientY
        };
        // If bottom part of context menu will be displayed
        // after right-click, then change the position of the
        // context menu. This position is controlled by `top` and `left`
        // at inline style. 
        // Instead of context menu is displayed from top left of cursor position
        // when right-click occur, it will be displayed from bottom left.
        if (browser.h -  pos.y < menu.h)
            pos.y = pos.y - menu.h
        if (browser.w -  pos.x < menu.w)
            pos.x = pos.x - menu.w
    }
    function onPageClick(e){
        // To make context menu disappear when
        // mouse is clicked outside context menu
        showMenu = false;
        onClick()
    }
    function getContextMenuDimension(node){
        // This function will get context menu dimension
        // when navigation is shown => showMenu = true
        let height = node.offsetHeight
        let width = node.offsetWidth
        menu = {
            h: height,
            w: width
        }
    }
    
    const copyToClipboard = () => {
        navigator.clipboard.writeText(local_id).then(() => {
                console.log('Text copied to clipboard:', local_id);
            }).catch((error) => {
                console.error('Error copying text to clipboard:', error);
            });
    };

    let menuItems = [
            {
              'name': 'copy',
              'onClick': copyToClipboard,
              'displayText': "Copy",
              'class': 'fa-solid fa-pencil-alt'
            }
        ];
  
  
  </script>
  <svelte:head>
    <!-- You can change icon sets according to your taste. Change `class` value in `menuItems` above to represent your icons. -->
    <!-- <link rel="stylesheet" href="/icon/css/mfglabs_iconset.css"> -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css" integrity="sha512-KfkfwYDsLkIlwQp6LFnl8zNdLGxu9YAA1QvwINks4PhcElQSvqcyVLLD9aMhXd13uQjoXtEKNosOWaZqXgel0g==" crossorigin="anonymous" referrerpolicy="no-referrer" />
  </svelte:head>
  
  {#if showMenu}
  <nav use:getContextMenuDimension style="position: absolute; top:{pos.y}px; left:{pos.x}px">
    <div class="navbar" id="navbar">  
        <ul>
            {#each menuItems as item}
                {#if item.name == "hr"}
                    <hr>
                {:else}
                    <li><button on:click={item.onClick}><i class={item.class}></i>{item.displayText}</button></li>
                {/if}
            {/each}
        </ul>
    </div>
  </nav>
  {/if}
  
  /* /<svelte:window 
    on:contextmenu|preventDefault={showMenu ? onPageClick : rightClickContextMenu}
    on:wheel|preventDefault={onPageClick}
    on:dblclick|preventDefault={onPageClick}  
  /> 
  

<style>
    * {
        padding: 0;
        margin: 0;
    }

    .navbar {
        display: inline-flex;
        border: 1px #555 solid; /* Borde sutil para tema oscuro */
        width: 250px;
        background-color: #2a2a2a; /* Fondo oscuro */
        border-radius: 10px;
        overflow: hidden;
        flex-direction: column;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    }

    .navbar ul {
        margin: 6px;
        padding: 0;
    }

    ul li {
        display: block;
        list-style-type: none;
    }

    ul li button {
        font-size: 1rem;
        color: #f0f0f0; /* Texto claro */
        width: 100%;
        height: 32px;
        text-align: left;
        border: 0;
        background-color: transparent; /* Fondo transparente */
        border-radius: 5px;
        cursor: pointer;
        display: flex;
        align-items: center;
        transition: background-color 0.2s, color 0.2s;
    }

    ul li button:hover {
        color: #fff;
        background-color: #FBBF24; /* Color de acento al pasar el ratón */
    }

    ul li button i {
        padding: 0 15px 0 10px;
        width: 18px; /* Ancho fijo para alinear iconos */
        text-align: center;
    }

    /* Estos estilos ya no son necesarios con el nuevo tema */
    /* ul li button i.fa-square { ... } */
    /* ul li button:hover > i.fa-square { ... } */

    ul li button:hover > i.warning {
        color: #ffcdd2; /* Un rojo más claro para el hover */
    }
    
    :global(ul li button.info:hover) {
        color: #e3f2fd; /* Un azul más claro */
    }

    hr {
        border: none;
        border-bottom: 1px solid #444; /* Borde más oscuro para el separador */
        margin: 5px 0;
    }
</style>
