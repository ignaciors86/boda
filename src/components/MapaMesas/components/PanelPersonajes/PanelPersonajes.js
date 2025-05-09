import React, { useState, useEffect, useCallback } from 'react';
import { FaEdit, FaTrash, FaTimes, FaSpinner, FaSearch, FaImage } from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';
import './PanelPersonajes.scss';

const GOOGLE_API_KEY = 'AIzaSyBxPVl2_pURrxvblJ-k8aI5reMt8XRxxYQ';
const SEARCH_ENGINE_ID = '818dc0dab99b14004';

const PanelPersonajes = ({
  isPanelOpen,
  setIsPanelOpen,
  urlstrapi = 'https://boda-strapi-production.up.railway.app',
  STRAPI_TOKEN
}) => {
  const [personajes, setPersonajes] = useState([]);
  const [selectedPersonaje, setSelectedPersonaje] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    imagen: null
  });
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [imageSearchTerm, setImageSearchTerm] = useState('');
  const [imageFormat, setImageFormat] = useState('photo');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [loadingImage, setLoadingImage] = useState(null);

  useEffect(() => {
    if (isPanelOpen) {
      fetchPersonajes();
    }
  }, [isPanelOpen]);

  const fetchPersonajes = async () => {
    try {
      const response = await fetch(`${urlstrapi}/api/personajes?populate=imagen`, {
        headers: {
          'Authorization': `Bearer ${STRAPI_TOKEN}`
        }
      });
      const data = await response.json();
      console.log('Respuesta completa de Strapi:', data);
      
      if (data.data) {
        const personajesFormateados = data.data.map(personaje => {
          console.log('Procesando personaje completo:', JSON.stringify(personaje, null, 2));
          const personajeFormateado = {
            id: personaje.id,
            documentId: personaje.documentId,
            nombre: personaje.nombre || '',
            descripcion: personaje.descripcion || '',
            imagen: personaje.imagen ? {
              id: personaje.imagen.id,
              url: personaje.imagen.url.startsWith('http') 
                ? personaje.imagen.url.replace(/^https?:\/\/[^/]+/, urlstrapi)
                : `${urlstrapi}${personaje.imagen.url}`
            } : null,
            createdAt: personaje.createdAt,
            updatedAt: personaje.updatedAt
          };
          console.log('Personaje formateado:', personajeFormateado);
          return personajeFormateado;
        });
        console.log('Personajes formateados:', personajesFormateados);
        setPersonajes(personajesFormateados);
      }
    } catch (error) {
      console.error('Error al obtener personajes:', error);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    try {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsUploading(true);
      console.log('Archivo seleccionado:', file);

      // Crear un FormData con el archivo
      const uploadFormData = new FormData();
      uploadFormData.append('files', file);

      console.log('Subiendo imagen a Strapi...', {
        fileName: file.name,
        type: file.type,
        size: file.size
      });

      const uploadResponse = await fetch(`${urlstrapi}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRAPI_TOKEN}`
        },
        body: uploadFormData
      });

      if (!uploadResponse.ok) {
        throw new Error('Error al subir la imagen');
      }

      const uploadData = await uploadResponse.json();
      console.log('Imagen subida correctamente:', uploadData[0]);

      // Actualizar el estado del formulario
      setFormData(prev => ({
        ...prev,
        imagen: uploadData[0].id
      }));

      // Construir la URL final de la imagen
      const finalImageUrl = uploadData[0].url.startsWith('http') 
        ? uploadData[0].url.replace(/^https?:\/\/[^/]+/, urlstrapi)
        : `${urlstrapi}${uploadData[0].url}`;

      setPreviewUrl(finalImageUrl);

      // Actualizar el personaje si está seleccionado
      if (selectedPersonaje?.documentId) {
        const updateResponse = await fetch(`${urlstrapi}/api/personajes/${selectedPersonaje.documentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${STRAPI_TOKEN}`
          },
          body: JSON.stringify({
            data: {
              imagen: uploadData[0].id
            }
          })
        });

        if (!updateResponse.ok) {
          throw new Error('Error al actualizar el personaje');
        }

        const updateResult = await updateResponse.json();
        console.log('Personaje actualizado:', updateResult);

        // Actualizar el estado del personaje seleccionado
        const updatedPersonaje = {
          ...selectedPersonaje,
          imagen: {
            id: uploadData[0].id,
            url: finalImageUrl
          }
        };
        setSelectedPersonaje(updatedPersonaje);

        // Actualizar la lista de personajes
        setPersonajes(prevPersonajes => 
          prevPersonajes.map(p => 
            p.id === selectedPersonaje.id 
              ? { ...p, imagen: { id: uploadData[0].id, url: finalImageUrl } }
              : p
          )
        );

        // Recargar los personajes
        await fetchPersonajes();
      }
    } catch (error) {
      console.error('Error al procesar la imagen:', error);
      setSearchError(`Error al procesar la imagen: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  }, [selectedPersonaje, urlstrapi, STRAPI_TOKEN]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.gif', '.jpg', '.jpeg', '.png']
    },
    maxFiles: 1
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        data: {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          imagen: formData.imagen
        }
      };

      let response;
      if (selectedPersonaje) {
        response = await fetch(`${urlstrapi}/api/personajes/${selectedPersonaje.documentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${STRAPI_TOKEN}`
          },
          body: JSON.stringify(dataToSend)
        });
      } else {
        response = await fetch(`${urlstrapi}/api/personajes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${STRAPI_TOKEN}`
          },
          body: JSON.stringify(dataToSend)
        });
      }

      if (!response.ok) {
        throw new Error('Error al guardar el personaje');
      }

      setFormData({ nombre: '', descripcion: '', imagen: null });
      setSelectedPersonaje(null);
      setPreviewUrl(null);
      fetchPersonajes();
    } catch (error) {
      console.error('Error al guardar personaje:', error);
    }
  };

  const handleEdit = (personaje) => {
    console.log('Editando personaje:', personaje);
    setSelectedPersonaje(personaje);
    setFormData({
      nombre: personaje.nombre,
      descripcion: personaje.descripcion,
      imagen: personaje.imagen ? personaje.imagen.id : null
    });
    setPreviewUrl(personaje.imagen ? personaje.imagen.url : null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este personaje?')) return;

    try {
      const response = await fetch(`${urlstrapi}/api/personajes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${STRAPI_TOKEN}`
        }
      });

      if (response.ok) {
        fetchPersonajes();
      }
    } catch (error) {
      console.error('Error al eliminar personaje:', error);
    }
  };

  // Función para filtrar y ordenar personajes
  const getFilteredAndSortedPersonajes = () => {
    return personajes
      .filter(personaje => 
        personaje.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        personaje.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  };

  const handleImageSearch = async (e) => {
    e.preventDefault();
    if (!imageSearchTerm.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(imageSearchTerm)}&searchType=image&imgType=${imageFormat}`;
    console.log('URL de búsqueda:', searchUrl);

    try {
      console.log('Iniciando búsqueda con términos:', {
        query: imageSearchTerm,
        format: imageFormat
      });

      const response = await fetch(searchUrl);
      console.log('Respuesta del servidor:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en la respuesta:', errorText);
        throw new Error(`Error en la búsqueda de imágenes: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Datos recibidos:', data);
      
      if (!data.items || data.items.length === 0) {
        console.log('No se encontraron resultados');
        setSearchError('No se encontraron imágenes para tu búsqueda');
      } else {
        console.log('Resultados encontrados:', data.items.length);
        // Modificar las URLs de las imágenes para usar el proxy CORS
        const modifiedItems = data.items.map(item => ({
          ...item,
          link: `https://corsproxy.io/?${encodeURIComponent(item.link)}`
        }));
        setSearchResults(modifiedItems);
      }
    } catch (error) {
      console.error('Error completo:', error);
      setSearchError(`Hubo un error al buscar imágenes: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setImageSearchTerm(value);
    
    // Limpiar el timeout anterior si existe
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Establecer un nuevo timeout para la búsqueda automática
    const timeout = setTimeout(() => {
      if (value.trim()) {
        handleImageSearch({ preventDefault: () => {} });
      }
    }, 1000);
    
    setSearchTimeout(timeout);
  };

  const handleSelectImage = async (imageUrl, index) => {
    try {
      setLoadingImage(index);
      console.log('Iniciando descarga de imagen:', imageUrl);

      // Obtener la imagen del elemento img que ya está cargada
      const imgElement = document.querySelector(`.search-result-item:nth-child(${index + 1}) img`);
      if (!imgElement) {
        throw new Error('No se encontró la imagen en el DOM');
      }

      // Determinar el tipo de imagen
      const isGif = imageUrl.toLowerCase().endsWith('.gif') || 
                   imgElement.src.toLowerCase().endsWith('.gif') ||
                   imgElement.src.includes('gif');

      let blob;
      if (isGif) {
        // Para GIFs, usar un proxy CORS y mantener el formato original
        console.log('Detectado GIF, descargando original...');
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`;
        
        const response = await fetch(proxyUrl, {
          headers: {
            'Accept': 'image/gif,image/*,*/*;q=0.8'
          }
        });

        if (!response.ok) {
          throw new Error('Error al descargar el GIF');
        }

        // Obtener el blob directamente del response
        blob = await response.blob();
        if (!blob) {
          throw new Error('Error al obtener el blob del GIF');
        }

        // Forzar el tipo a GIF si es necesario
        if (!blob.type.includes('gif')) {
          console.log('Forzando tipo de archivo a GIF');
          blob = new Blob([blob], { type: 'image/gif' });
        }

        console.log('GIF descargado, tamaño:', blob.size, 'tipo:', blob.type);
      } else {
        // Para otras imágenes, usar el método del canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Esperar a que la imagen se cargue completamente
        await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = resolve;
          img.onerror = reject;
          img.src = imgElement.src;
        });

        canvas.width = imgElement.naturalWidth;
        canvas.height = imgElement.naturalHeight;
        ctx.drawImage(imgElement, 0, 0);

        // Convertir el canvas a blob
        blob = await new Promise((resolve, reject) => {
          canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Error al convertir la imagen'));
          }, 'image/jpeg', 0.95);
        });

        console.log('Imagen convertida, tamaño:', blob.size);
      }

      // Crear un archivo a partir del blob
      const fileName = `image-${Date.now()}.${isGif ? 'gif' : 'jpg'}`;
      const file = new File([blob], fileName, { 
        type: isGif ? 'image/gif' : 'image/jpeg',
        lastModified: new Date().getTime()
      });

      // Crear un FormData con el archivo
      const uploadFormData = new FormData();
      uploadFormData.append('files', file);

      console.log('Subiendo imagen a Strapi...', {
        fileName,
        type: file.type,
        size: file.size,
        isGif
      });

      const uploadResponse = await fetch(`${urlstrapi}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRAPI_TOKEN}`
        },
        body: uploadFormData
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Error en la respuesta de Strapi:', errorText);
        throw new Error('Error al subir la imagen a Strapi');
      }

      const uploadData = await uploadResponse.json();
      console.log('Imagen subida correctamente:', uploadData[0]);

      // Verificar que la URL de la imagen subida sea accesible
      const imageCheckResponse = await fetch(uploadData[0].url);
      if (!imageCheckResponse.ok) {
        console.warn('La imagen subida no es accesible directamente:', uploadData[0].url);
      }

      // Actualizar el personaje con la nueva imagen
      if (selectedPersonaje?.documentId) {
        console.log('Actualizando personaje con ID:', selectedPersonaje.documentId);
        const updateResponse = await fetch(`${urlstrapi}/api/personajes/${selectedPersonaje.documentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${STRAPI_TOKEN}`
          },
          body: JSON.stringify({
            data: {
              imagen: uploadData[0].id
            }
          })
        });

        if (!updateResponse.ok) {
          throw new Error('Error al actualizar el personaje');
        }

        const updateResult = await updateResponse.json();
        console.log('Personaje actualizado:', updateResult);

        // Esperar a que la actualización se complete
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Construir la URL final de la imagen
      const finalImageUrl = uploadData[0].url.startsWith('http') 
        ? uploadData[0].url.replace(/^https?:\/\/[^/]+/, urlstrapi)
        : `${urlstrapi}${uploadData[0].url}`;
      console.log('URL final de la imagen:', finalImageUrl);

      // Verificar que la URL final sea accesible
      const finalImageCheckResponse = await fetch(finalImageUrl);
      if (!finalImageCheckResponse.ok) {
        console.warn('La URL final de la imagen no es accesible:', finalImageUrl);
      }

      // Actualizar el estado del formulario
      setFormData(prev => {
        const newFormData = {
          ...prev,
          imagen: uploadData[0].id
        };
        console.log('Nuevo formData:', newFormData);
        return newFormData;
      });

      // Actualizar la URL de vista previa
      setPreviewUrl(finalImageUrl);
      setShowImageSearch(false);

      // Limpiar recursos
      if (isGif) {
        URL.revokeObjectURL(imgElement.src);
      }

      // Actualizar el estado del personaje seleccionado
      if (selectedPersonaje) {
        const updatedPersonaje = {
          ...selectedPersonaje,
          imagen: {
            id: uploadData[0].id,
            url: finalImageUrl
          }
        };
        console.log('Actualizando personaje seleccionado:', updatedPersonaje);
        setSelectedPersonaje(updatedPersonaje);
      }

      // Actualizar la lista de personajes
      const updatedPersonajes = personajes.map(p => {
        if (p.id === selectedPersonaje?.id) {
          const updated = {
            ...p,
            imagen: {
              id: uploadData[0].id,
              url: finalImageUrl
            }
          };
          console.log('Actualizando personaje en la lista:', updated);
          return updated;
        }
        return p;
      });
      console.log('Nueva lista de personajes:', updatedPersonajes);
      setPersonajes(updatedPersonajes);

      // Recargar los personajes desde Strapi
      await fetchPersonajes();

    } catch (error) {
      console.error('Error al procesar la imagen:', error);
      setSearchError(`Error al procesar la imagen: ${error.message}. Por favor, intenta con otra imagen.`);
    } finally {
      setLoadingImage(null);
    }
  };

  return (
    <>
      <div className={`panel-personajes ${isPanelOpen ? 'open' : ''}`}>
        <div className="dashboard-header">
          <h2>Administrar Personajes</h2>
          <div className="header-actions">
            <button 
              className="close-btn"
              onClick={() => setIsPanelOpen(false)}
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="form-section">
            <form className="panel-personajes-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre del Personaje</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ingresa el nombre del personaje"
                  required
                />
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Describe el personaje..."
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label>Imagen</label>
                <div className="image-upload-container">
                  <div className="image-upload-options">
                    <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                      <input {...getInputProps()} />
                      {isUploading ? (
                        <FaSpinner className="spinner" />
                      ) : isDragActive ? (
                        <p>Suelta la imagen aquí...</p>
                      ) : (
                        <p>Arrastra una imagen o haz clic para seleccionar</p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="search-image-button"
                      onClick={() => setShowImageSearch(true)}
                    >
                      <FaSearch /> Buscar imagen
                    </button>
                  </div>
                  {previewUrl && (
                    <div className="image-preview">
                      <img src={previewUrl} alt="Preview" />
                      <button 
                        type="button" 
                        className="remove-image"
                        onClick={() => {
                          setPreviewUrl(null);
                          setFormData(prev => ({ ...prev, imagen: null }));
                        }}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                className="submit-btn"
                disabled={isUploading}
              >
                {selectedPersonaje ? 'Actualizar Personaje' : 'Crear Personaje'}
              </button>
            </form>
          </div>

          <div className="list-section">
            <h3>Personajes Existentes</h3>
            <div className="search-container">
              <input
                type="text"
                placeholder="Buscar personajes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            {personajes.length === 0 ? (
              <div className="empty-state">No hay personajes creados</div>
            ) : (
              <div className="personajes-grid">
                {getFilteredAndSortedPersonajes().map((personaje) => (
                  <div 
                    key={personaje.id} 
                    className="personaje-item"
                    onClick={() => handleEdit(personaje)}
                  >
                    <div className="personaje-image">
                      {personaje.imagen ? (
                        <img src={personaje.imagen.url} alt={personaje.nombre} />
                      ) : (
                        <div style={{ 
                          width: '100%', 
                          height: '100%', 
                          background: '#6366f1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '2rem'
                        }}>
                          {personaje.nombre[0]}
                        </div>
                      )}
                    </div>
                    <div className="personaje-info">
                      <h4>{personaje.nombre}</h4>
                      <p className="descripcion">{personaje.descripcion}</p>
                      <div className="personaje-meta">
                        <span className="fecha">Creado: {new Date(personaje.createdAt).toLocaleDateString()}</span>
                        <span className="fecha">Actualizado: {new Date(personaje.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="personaje-actions">
                        <button 
                          className="delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(personaje.id);
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <button 
        className={`panel-personajes-toggle ${isPanelOpen ? 'open' : ''}`}
        onClick={() => setIsPanelOpen(!isPanelOpen)}
      />

      {showImageSearch && (
        <div className="image-search-modal">
          <div className="image-search-content">
            <div className="image-search-header">
              <h3>Buscar imagen</h3>
              <button onClick={() => setShowImageSearch(false)}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleImageSearch} className="image-search-form">
              <div className="search-input-group">
                <input
                  type="text"
                  value={imageSearchTerm}
                  onChange={handleSearchInputChange}
                  placeholder="Buscar imágenes..."
                />
                <select
                  value={imageFormat}
                  onChange={(e) => setImageFormat(e.target.value)}
                >
                  <option value="photo">Fotos</option>
                  <option value="face">Caras</option>
                  <option value="clipart">Clipart</option>
                  <option value="lineart">Dibujos</option>
                  <option value="animated">GIFs</option>
                </select>
                <button type="submit" disabled={isSearching || !imageSearchTerm.trim()}>
                  {isSearching ? <FaSpinner className="spinner" /> : <FaSearch />}
                  {isSearching ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </form>
            <div className="search-results">
              {searchError ? (
                <div className="no-results">
                  {searchError}
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((result, index) => (
                  <div
                    key={index}
                    className={`search-result-item ${loadingImage === index ? 'loading' : ''}`}
                    onClick={() => handleSelectImage(result.link, index)}
                  >
                    <img 
                      src={result.link} 
                      alt={result.title}
                      crossOrigin="anonymous"
                      onError={(e) => {
                        console.error('Error al cargar la imagen:', e);
                        // Usar una imagen de error en base64
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5FcnJvciBhbCBjYXJnYXI8L3RleHQ+PC9zdmc+';
                      }}
                    />
                    <div className="overlay">Seleccionar</div>
                    {loadingImage === index && (
                      <div className="loading-overlay">
                        <div className="spinner"></div>
                        <div className="loading-text">
                          Descargando y subiendo imagen...
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : !isSearching && imageSearchTerm.trim() ? (
                <div className="no-results">
                  No se encontraron imágenes para tu búsqueda
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PanelPersonajes; 