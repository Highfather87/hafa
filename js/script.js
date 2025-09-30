
    /* 
    1. Rafah Landmarks - معالم في رفح
    2. Rafah Streets - شوارع في رفح
    3. Admin Boundaries - أحياء رفح الإدارية
    4. Rafah Neighborhoods - أحياء رفح المعاشة    
    */ 

    //need to swap out with Feb's own token

	mapboxgl.accessToken = 'pk.eyJ1IjoiZmlzaGZhdGhlciIsImEiOiJjbGRzcjI4M2kyMDV6M250NjdwNnBrMTMzIn0.bRvtyOBQKvF2H-F10EwfFQ';
    const map = new mapboxgl.Map({
        container: 'map', // container ID
        style: 'mapbox://styles/mapbox/standard-satellite',
        center: [34.3, 31.3], // starting position [lng, lat]. Note that lat must be set between -90 and 90
        zoom: 12 // starting zoom
    });

    const layerList = document.getElementById('menu');
    const inputs = layerList.getElementsByTagName('input');

    const formContainer = document.getElementById("uploadFormContainer");
    const uploadForm = document.getElementById("uploadForm");
    const closeBtn = document.getElementById("closeForm");


    let clickedCoords = null;       

    for (const input of inputs) {
        input.onclick = (layer) => {
            const layerId = layer.target.id;
            map.setStyle('mapbox://styles/mapbox/' + layerId);
        };
    }


    map.on('load', () => {
        // Add default layers here
    });

    map.on('style.load', () =>
    {
        //set the defualt atmosphere style
        map.setFog({}); //what is this?

        //admin source 
        map.addSource('rafah-admin-boundaries',
        {
            type: 'geojson',
            data: 'data/rafah-adm-districts.geojson'
        })

        map.addSource('rafah-neighborhoods',
        {
            type: 'geojson',
            data: 'data/rafah-neighborhoods.geojson'
        })
        map.addSource('rafah-landmarks',
        {
            type: 'geojson',
            data: 'data/rafah-landmarks.geojson'
        })
        //streets source
        map.addSource('rafah-streets',
        {
            type: 'geojson',
            data: 'data/rafah-streets.geojson'
        })

        map.addLayer({
            id: 'rafah-admin-boundaries-fill',
            type: 'fill',
            source: 'rafah-admin-boundaries',
            paint: {
                'fill-color':'#8cb03f',
                'fill-opacity': 0.7,
                'fill-outline-color': '#000', 
            }
        })

        map.addLayer({
            'id': 'rafah-neighborhoods',
            'type': 'fill',
            'source': 'rafah-neighborhoods',
            'layout': {
                // Make the layer visible by default.
                'visibility': 'visible'
            },
            'paint': {
                'fill-color': '#f08',
                'fill-opacity': 0.5
            }
        });

        map.addLayer({
            'id': 'rafah-streets',
            'type': 'line',
            'source': 'rafah-streets',
          //  'source-layer': 'rafah-streets',
            'layout': {
                // Make the layer visible by default.
                'visibility': 'visible',
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#000000',
                'line-width': 3
            }
        });


        map.addLayer({
            id: 'rafah-admin-boundaries-labels',
            type: 'symbol',
            source: 'rafah-admin-boundaries',
            layout: {
                'text-field': ['get','Name AR'],
                'text-font': ['Open Sans Bold'],
                'text-size': 14,
                'text-offset': [0, 1.5],
                'text-anchor': 'top'
            }
        })

         //add the layers to the map

        map.addLayer({
            'id': 'rafah-landmarks',
            'type': 'circle',
            'source': 'rafah-landmarks',
            'layout': {
                // Make the layer visible by default.
                'visibility': 'visible'
            },
            'paint': {
                'circle-radius': 3,
                'circle-color': '#FF0000',
                'circle-opacity': 0.8,
                'circle-stroke-opacity': 0.8,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#000000'
            },
            //'source-layer': 'rafah-landmarks'
        });       

        // Load points from backend
        async function loadPoints() {
        const res = await fetch("https://hafa-1.onrender.com/landmarks");
        const data = await res.json();

        if (map.getSource("uploads")) {
            map.getSource("uploads").setData(data);
        } else {
            map.addSource("uploads", { type: "geojson", data });
            map.addLayer({
            id: "uploads-layer",
            type: "symbol",
            source: "uploads",
            layout: { "icon-image": "marker-15", "icon-size": 1.5 }
            });

            // Popup with image + description
            map.on("click", "uploads-layer", (e) => {
            const feature = e.features[0];
            const { Description, Image, Name } = feature.properties;

            new mapboxgl.Popup()
                .setLngLat(feature.geometry.coordinates)
                .setHTML(`
                <strong>${Name}</strong><br>
                ${Image ? `<img src="https://hafa-ha2k.onrender.com${Image}" width="200">` : ""}
                <p>${Description || ""}</p>
                `)
                .addTo(map);
            });
        }
        }
        



    });

    // Radio buttons behavior
    const radios = document.querySelectorAll('input[name="layer-toggle"]');
    radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        layerIds.forEach(layerId => {
            map.setLayoutProperty(
                layerId,
                'visibility',
                layerId === e.target.value ? 'visible' : 'none'
                );
            });
        });
        });
    // Change the cursor to a pointer when the mouse is over a POI.
    map.addInteraction('landmark-mouseenter-interaction', {
        type: 'mouseenter',
        target: { layerId: 'rafah-landmarks' },
        handler: () => {
            map.getCanvas().style.cursor = 'pointer';
        }
    });

    // Change the cursor back to a pointer when it stops hovering over a POI.
    map.addInteraction('landmark-mouseleave-interaction', {
        type: 'mouseleave',
        target: { layerId: 'rafah-landmarks' },
        handler: () => {
            map.getCanvas().style.cursor = '';
        }
    });

    const popup_hover = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
    });

    map.on('mousemove', 'rafah-landmarks', (e) => {
        // Change the cursor style as a UI indicator.
        map.getCanvas().style.cursor = 'pointer';

        // Copy coordinates array.
        const coordinates = e.features[0].geometry.coordinates.slice();
        const name = e.features[0].properties.Name;

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        // Populate the popup and set its coordinates
        // based on the feature found.
        popup_hover.setLngLat(coordinates).setHTML(`<strong>${name}</strong>`).addTo(map);
    });
    // Remove popup when not hovering
    map.on('mouseleave', 'rafah-landmarks', () => {
        map.getCanvas().style.cursor = '';
        popup_hover.remove();
    });


    // map.on("load", loadPoints);


    map.on('click', 'rafah-landmarks', (e) => {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const name = e.features[0].properties.Name;

        new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(`
            <strong>${name}</strong>
            <p><a href="#" id="upload-link">رفع صورة</a></p>
            `)
            .addTo(map);

        // Wait until popup is added to DOM
        setTimeout(() => {
            const link = document.getElementById("upload-link");
            if (link) {
            link.addEventListener("click", (event) => {
                event.preventDefault();
                // Show full container
                formContainer.style.display = "block";
                // Fill hidden fields
                uploadForm.lng.value = coordinates[0];
                uploadForm.lat.value = coordinates[1];
            });
            }
        }, 0);
    });

    // Close button
    closeBtn.addEventListener("click", () => {
    formContainer.style.display = "none";
    });

    // Handle upload form submit
    uploadForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(uploadForm);

        const res = await fetch("https://hafa-1.onrender.com/upload", {
            method: "POST",
            body: formData
        });

        if (res.ok) {
        alert("✅ Upload successful!");
        formContainer.style.display = "none"; // hide full dialog
        uploadForm.reset();
        loadPoints(); // refresh uploaded markers
        } else {
            alert("❌ Upload failed.");
        }
    });


    map.on('idle', () => {
    if (!map.getLayer('rafah-streets') || !map.getLayer('rafah-admin-boundaries-fill')) {
        return;
    }


    const layerLabels = {
        'rafah-streets': 'شوارع في رفح',
        'rafah-neighborhoods': 'أحياء رفح المعاشة',
        'rafah-landmarks': 'معالم في رفح',
        'rafah-admin-boundaries-fill': 'أحياء رفح الإدارية'
    };

    const toggleableLayerIds = Object.keys(layerLabels);

    for (const id of toggleableLayerIds) {
        if (document.getElementById(id)) {
            continue;
        }

        const link = document.createElement('a');
        link.id = id;
        link.href = '#';
        link.textContent = layerLabels[id]; //Arabic label
        link.className = 'active';

        link.onclick = function (e) {
            //const clickedLayer = this.textContent;
            e.preventDefault();
            e.stopPropagation();

            const clickedLayer = this.id;
            const visibility = map.getLayoutProperty(clickedLayer, 'visibility');

            if (visibility === 'visible') {
                map.setLayoutProperty(clickedLayer, 'visibility', 'none');
                this.className = '';
            } else {
                this.className = 'active';
                map.setLayoutProperty(clickedLayer, 'visibility', 'visible');
            }
        };

        document.getElementById('soju').appendChild(link);
    }

    // 🔥 Add the “Add Landmark” option if not already added
    if (!document.getElementById('toggle-add-landmark')) {
        const addLandmarkLink = document.createElement('a');
        addLandmarkLink.id = 'toggle-add-landmark';
        addLandmarkLink.href = '#';
        addLandmarkLink.textContent = '➕ Add Landmark';
        document.getElementById('soju').appendChild(addLandmarkLink);

        let addLandmarkMode = false;
        let tempMarker = null; // will hold the temporary marker

        addLandmarkLink.addEventListener('click', (e) => {
            e.preventDefault();
            addLandmarkMode = !addLandmarkMode;
            addLandmarkLink.classList.toggle('active', addLandmarkMode);

            if (addLandmarkMode) {
                alert('📍 Click anywhere on the map to add a new landmark');
                map.getCanvas().style.cursor = 'crosshair'; // change cursor
            }
            else {
                map.getCanvas().style.cursor = ''; // reset cursor
                if (tempMarker) {
                    tempMarker.remove();
                    tempMarker = null;
                }
            }
        });

        // Handle map clicks when in add-landmark mode
        map.on('click', (e) => {
            if (!addLandmarkMode) return;

            const lng = e.lngLat.lng;
            const lat = e.lngLat.lat;

            // Remove old temp marker if exists
            if (tempMarker) {
                tempMarker.remove();
            }

            // Add a new temporary marker
            tempMarker = new mapboxgl.Marker({ color: 'red' })
                .setLngLat([lng, lat])
                .addTo(map);

            // Show upload form
            formContainer.style.display = 'block';
            uploadForm.lng.value = lng;
            uploadForm.lat.value = lat;

            // Exit add-landmark mode (single use)
            addLandmarkMode = false;
            addLandmarkLink.classList.remove('active');
            map.getCanvas().style.cursor = ''; // reset cursor
        });
    }
});
    
document.getElementById("arabicInput").addEventListener("input", function() {
this.value = this.value.replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0660-\u0669،؛؟\s]/g, '');
});