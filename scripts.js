document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('formulario');
  const message = document.getElementById('message');
  const btnPhoto = document.getElementById('btnPhoto');
  const photoInput = document.getElementById('foto');
  const photoPreview = document.getElementById('foto-preview');
  const submitBtn = document.getElementById('enviar');
  const clearBtn = document.getElementById('limpiar');
  const referenciaSelect = document.getElementById('referencia');
  const fechasContainer = document.getElementById('fechas-container');
  const idList = document.getElementById('lista-ids');
  const btnTakePhoto = document.getElementById('btnTakePhoto');
  const btnUploadPhoto = document.getElementById('btnUploadPhoto');
  const btnAddAnother = document.getElementById('btnAddAnother');
  const savedPeople = document.getElementById('saved-people');

  // Load face-api models
  await loadFaceDetectionModels();

  // Validación en tiempo real
  const inputs = form.querySelectorAll('input[required], select[required]');
  inputs.forEach(input => {
    // Ensure each input has an error message span
    let errorSpan = input.nextElementSibling;
    if (!errorSpan || !errorSpan.classList.contains('error-message')) {
      errorSpan = document.createElement('span');
      errorSpan.className = 'error-message';
      input.parentNode.insertBefore(errorSpan, input.nextSibling);
    }

    input.addEventListener('input', validateInput);
    input.addEventListener('blur', validateInput);
  });

  function validateInput(e) {
    const input = e.target;
    const errorElement = input.nextElementSibling;
    
    if (!errorElement || !errorElement.classList.contains('error-message')) {
      console.warn('Error message element not found for', input);
      return;
    }
    
    if (input.validity.valid) {
      input.classList.remove('error');
      errorElement.style.display = 'none';
      errorElement.textContent = '';
    } else {
      input.classList.add('error');
      errorElement.style.display = 'block';
      errorElement.textContent = getErrorMessage(input);
    }
    
    checkFormValidity();
  }

  function getErrorMessage(input) {
    if (!input) return 'Error de validación';
    if (input.validity.valueMissing) return 'Este campo es requerido';
    if (input.validity.patternMismatch) return input.title || 'Formato inválido';
    if (input.validity.tooShort) return `Mínimo ${input.minLength} caracteres`;
    if (input.validity.tooLong) return `Máximo ${input.maxLength} caracteres`;
    return 'Valor inválido';
  }

  function checkFormValidity() {
    if (!form || !submitBtn) return;
    
    // Check if there are any saved people
    const hasSavedPeople = savedPeople && savedPeople.children.length > 0;
    
    // If there are saved people, enable submit button regardless of current form state
    if (hasSavedPeople) {
      submitBtn.disabled = false;
      return;
    }
    
    // Otherwise, check if current form data is valid
    const currentFormIsValid = form.checkValidity() && photoInput.files.length > 0;
    submitBtn.disabled = !currentFormIsValid;
  }

  // Manejo de la foto
  btnTakePhoto.addEventListener('click', () => {
    photoInput.setAttribute('capture', 'camera');
    photoInput.click();
  });

  btnUploadPhoto.addEventListener('click', () => {
    photoInput.removeAttribute('capture');
    photoInput.click();
  });

  photoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
          const analysis = await analyzeFace(img);
          if (analysis.success) {
            photoPreview.style.backgroundImage = `url(${img.src})`;
            photoPreview.innerHTML = '';
            checkFormValidity();
          } else {
            showMessage(analysis.message, 'error');
            photoInput.value = '';
            photoPreview.style.backgroundImage = '';
            photoPreview.innerHTML = `
              <span class="foto-placeholder">
                <svg width="40" height="40" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </span>
            `;
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Mostrar/ocultar fechas según referencia
  referenciaSelect.addEventListener('change', () => {
    const showDates = ['inquilino', 'inquilino-temporal'].includes(referenciaSelect.value);
    fechasContainer.classList.toggle('hidden', !showDates);
    
    const dateInputs = fechasContainer.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
      input.required = showDates;
    });
    
    checkFormValidity();
  });

  // Limpiar formulario
  clearBtn.addEventListener('click', () => {
    form.reset();
    photoPreview.style.backgroundImage = '';
    photoPreview.innerHTML = `
      <span class="foto-placeholder">
        <svg width="40" height="40" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </span>
    `;
    fechasContainer.classList.add('hidden');
    
    // Clear saved people
    savedPeople.innerHTML = '';
    
    // Clear generated IDs
    idList.innerHTML = '';
    
    // Restaurar valores guardados de la propiedad
    const propertyFields = ['unidad', 'referencia', 'fecha-alta', 'fecha-fin'];
    propertyFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        const savedValue = field.getAttribute('data-saved-value');
        if (savedValue) {
          field.value = savedValue;
        }
      }
    });

    inputs.forEach(input => {
      input.classList.remove('error');
      const errorElement = input.nextElementSibling;
      if (errorElement && errorElement.classList.contains('error-message')) {
        errorElement.style.display = 'none';
        errorElement.textContent = '';
      }
    });
    submitBtn.disabled = true;
  });

  // Agregar otra persona
  btnAddAnother.addEventListener('click', () => {
    const requiredPersonalFields = ['apellido', 'nombre', 'documento', 'telefono'];
    const arePersonalFieldsValid = requiredPersonalFields.every(fieldId => {
      const field = document.getElementById(fieldId);
      return field && field.validity.valid;
    });
    
    if (arePersonalFieldsValid && photoInput.files.length > 0) {
      const formData = new FormData(form);
      savePersonData(formData);
      showNotification(`${formData.get('nombre')} ${formData.get('apellido')} ha sido agregado correctamente`);
      
      // Solo limpiar campos personales y foto
      requiredPersonalFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
      });
      
      // Limpiar foto
      photoPreview.style.backgroundImage = '';
      photoPreview.innerHTML = `
        <span class="foto-placeholder">
          <svg width="40" height="40" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </span>
      `;
      photoInput.value = '';
      
      // Mantener los datos de la propiedad
      const propertyFields = ['unidad', 'referencia', 'fecha-alta', 'fecha-fin'];
      propertyFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
          field.setAttribute('data-saved-value', field.value);
        }
      });
      
      checkFormValidity();
    } else {
      showMessage('Por favor complete todos los campos personales requeridos y agregue una foto', 'error');
    }
  });

  function savePersonData(formData) {
    const personDiv = document.createElement('div');
    personDiv.className = 'saved-person';
    personDiv.innerHTML = `
      <div class="person-icon">
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
      <div class="person-info">
        <strong>${formData.get('apellido')}, ${formData.get('nombre')}</strong>
        <div>Unidad: ${formData.get('unidad')} - ${formData.get('referencia')}</div>
      </div>
    `;
    savedPeople.appendChild(personDiv);
    
    // Check form validity after adding person
    checkFormValidity();
  }

  function showNotification(text) {
    showMessage(text, 'success');
  }

  function showMessage(text, type) {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    
    const popup = document.createElement('div');
    popup.className = `popup-message ${type}`;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => {
      overlay.remove();
    };
    
    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'btn-photo';
    acceptBtn.textContent = 'Aceptar';
    acceptBtn.onclick = () => {
      overlay.remove();
    };
    
    const messageContent = document.createElement('div');
    messageContent.innerHTML = text;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginTop = '1rem';
    buttonContainer.appendChild(acceptBtn);
    
    popup.appendChild(closeBtn);
    popup.appendChild(messageContent);
    popup.appendChild(buttonContainer);
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      if (document.body.contains(overlay)) {
        overlay.remove();
      }
    }, 3000);
  }

  // Envío del formulario
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentFormIsValid = form.checkValidity() && photoInput.files.length > 0;
    const hasSavedPeople = savedPeople && savedPeople.children.length > 0;
    
    if (!currentFormIsValid && hasSavedPeople) {
      // Show confirmation popup
      const overlay = document.createElement('div');
      overlay.className = 'popup-overlay';
      
      const popup = document.createElement('div');
      popup.className = 'popup-message';
      
      const messageContent = document.createElement('div');
      messageContent.innerHTML = `
        <p>Solo se enviarán los datos de las siguientes personas guardadas:</p>
        <div class="saved-summary">
          ${Array.from(savedPeople.children)
            .map(person => person.querySelector('.person-info strong').textContent)
            .join('<br>')}
        </div>
        <p>¿Desea continuar con el envío o seguir cargando datos?</p>
      `;
      
      const buttonContainer = document.createElement('div');
      buttonContainer.style.display = 'flex';
      buttonContainer.style.gap = '1rem';
      buttonContainer.style.marginTop = '1rem';
      buttonContainer.style.justifyContent = 'center';
      
      const continueBtn = document.createElement('button');
      continueBtn.className = 'btn-photo';
      continueBtn.textContent = 'Continuar cargando';
      continueBtn.onclick = () => {
        overlay.remove();
      };
      
      const sendBtn = document.createElement('button');
      sendBtn.className = 'btn-photo';
      sendBtn.textContent = 'Enviar datos';
      sendBtn.onclick = async () => {
        overlay.remove();
        await processSavedPeople();
      };
      
      buttonContainer.appendChild(continueBtn);
      buttonContainer.appendChild(sendBtn);
      
      popup.appendChild(messageContent);
      popup.appendChild(buttonContainer);
      
      overlay.appendChild(popup);
      document.body.appendChild(overlay);
      return;
    }
    
    // If we get here, either the current form is valid or we're processing after confirmation
    try {
      await processSavedPeople();
    } catch (error) {
      showMessage('Error al generar los IDs. Intente nuevamente.', 'error');
    }
  });

  // New function to process saved people
  async function processSavedPeople() {
    const formData = new FormData(form);
    // Simular envío a servidor
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get all saved people data
    const savedPeopleData = Array.from(savedPeople.children).map(personDiv => {
      const nameText = personDiv.querySelector('.person-info strong').textContent;
      const [apellido, nombre] = nameText.split(', ');
      const [unidad, referencia] = personDiv.querySelector('.person-info div').textContent
        .replace('Unidad: ', '').split(' - ');
      
      return { apellido, nombre, unidad, referencia };
    });
    
    // Create ID cards for all saved people
    savedPeopleData.forEach(personData => {
      const idCard = `
        <div class="id-card">
          <div class="person-icon">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <div class="id-info">
            <h3>${personData.apellido}, ${personData.nombre}</h3>
            <p>Unidad: ${personData.unidad} - ${personData.referencia}</p>
          </div>
        </div>
      `;
      idList.insertAdjacentHTML('afterbegin', idCard);
    });
    
    // If current form is valid, create ID card for current form data
    if (form.checkValidity() && photoInput.files.length > 0) {
      const idCard = createIdCard(formData);
      idList.insertAdjacentHTML('afterbegin', idCard);
    }
    
    // Show success message
    showMessage('IDs generados correctamente', 'success');
    
    // Clear form and saved people
    clearBtn.click();
    savedPeople.innerHTML = '';
  }

  function createIdCard(formData) {
    const photoUrl = URL.createObjectURL(formData.get('foto'));
    return `
      <div class="id-card">
        <img src="${photoUrl}" alt="Foto">
        <div class="id-info">
          <h3>${formData.get('apellido')}, ${formData.get('nombre')}</h3>
          <p>Unidad: ${formData.get('unidad')} - ${formData.get('referencia')}</p>
        </div>
      </div>
    `;
  }

  // Updated model loading function
  async function loadFaceDetectionModels() {
    try {
      // Update model paths to use the new CDN
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      console.log('Face detection models loaded successfully');
    } catch (error) {
      console.error('Error loading face detection models:', error);
      showMessage('Error al cargar los modelos de detección facial. Algunas funciones pueden no estar disponibles.', 'error');
    }
  }

  async function analyzeFace(imageElement) {
    try {
      // Create a temporary canvas for processing
      const canvas = document.createElement('canvas');
      canvas.width = imageElement.width;
      canvas.height = imageElement.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageElement, 0, 0);

      // Detect all faces to ensure there's only one
      const detections = await faceapi.detectAllFaces(
        canvas,
        new faceapi.TinyFaceDetectorOptions({ 
          inputSize: 512,
          scoreThreshold: 0.3
        })
      ).withFaceLandmarks();

      if (!detections || detections.length === 0) {
        return {
          success: false,
          message: 'No se detectó ningún rostro en la imagen. Por favor, tome una foto donde se vea claramente su rostro.'
        };
      }

      if (detections.length > 1) {
        return {
          success: false,
          message: 'Se detectó más de una persona en la imagen. Por favor, tome una foto individual.'
        };
      }

      const detection = detections[0];

      // Check if face is centered
      const imageCenter = canvas.width / 2;
      const faceCenter = detection.detection.box.x + (detection.detection.box.width / 2);
      const isCentered = Math.abs(imageCenter - faceCenter) < (canvas.width * 0.3);

      // Check face rotation using landmarks
      const landmarks = detection.landmarks;
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      const nose = landmarks.getNose();
      
      // Calculate horizontal angle (yaw)
      const eyeDistanceX = rightEye[0].x - leftEye[0].x;
      const noseOffset = Math.abs((leftEye[0].x + rightEye[0].x) / 2 - nose[0].x);
      const yawAngle = noseOffset / eyeDistanceX;
      
      // Calculate vertical angle (pitch)
      const eyeSlope = Math.abs((rightEye[0].y - leftEye[0].y) / eyeDistanceX);
      
      const isFrontal = yawAngle < 0.2 && eyeSlope < 0.15;

      if (!isCentered) {
        return {
          success: false,
          message: 'Por favor, centre su rostro en la imagen.'
        };
      }

      if (!isFrontal) {
        return {
          success: false,
          message: 'Por favor, mire directamente a la cámara. No se permiten fotos de perfil.'
        };
      }

      // Analyze background complexity with reduced sensitivity
      const backgroundComplexity = await analyzeBackgroundComplexity(canvas, detection);

      if (backgroundComplexity > 0.6) {
        return {
          success: false,
          message: 'El fondo de la imagen es demasiado complejo. Por favor, use un fondo más liso.'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error analyzing face:', error);
      return {
        success: false,
        message: 'Error al analizar la imagen. Por favor, intente nuevamente.'
      };
    }
  }

  async function analyzeBackgroundComplexity(imageElement, faceDetection) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    
    // Draw image
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    
    // Create mask to exclude face area with padding
    const faceBox = faceDetection.detection.box;
    const padding = 20; 
    ctx.fillStyle = 'black';
    ctx.fillRect(
      Math.max(0, faceBox.x - padding), 
      Math.max(0, faceBox.y - padding), 
      faceBox.width + (padding * 2), 
      faceBox.height + (padding * 2)
    );
    
    // Get image data excluding face area
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Calculate variation in pixel values with reduced sensitivity
    let totalVariation = 0;
    const samplingRate = 4; 
    for (let i = 0; i < data.length; i += (4 * samplingRate)) {
      if (i > 0) {
        totalVariation += Math.abs(data[i] - data[i - 4]) * 0.5; 
        totalVariation += Math.abs(data[i + 1] - data[i - 3]) * 0.3; 
        totalVariation += Math.abs(data[i + 2] - data[i - 2]) * 0.2; 
      }
    }
    
    // Normalize the variation value with reduced sensitivity
    return totalVariation / (canvas.width * canvas.height * 3) * 0.5; 
  }
document.getElementById("formulario").addEventListener("submit", function (e) {
  e.preventDefault();

  const data = {
    apellido: document.getElementById("apellido").value,
    nombre: document.getElementById("nombre").value,
    documento: document.getElementById("documento").value,
    telefono: document.getElementById("telefono").value,
    unidad: document.getElementById("unidad-funcional").value,
    referencia: document.getElementById("referencia").value,
    fecha_inicio: document.getElementById("fecha-inicio").value,
    fecha_fin: document.getElementById("fecha-fin").value,
    foto_url: "" // Añade aquí la URL si gestionas las fotos.
  };

  fetch("TU_URL_DE_LA_API", {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json"
    }
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.status === "success") {
        alert("Datos enviados correctamente");
      } else {
        alert("Error al enviar los datos");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });