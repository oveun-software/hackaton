# Enfoque para el hackatón

Revisado el **22 de octubre de 2026** en las [bases del evento](https://hackathon.genai.works/event/open-agent-hackathon-2026), desplegando sus diez secciones. La información de Academy y Meterless contiene versiones anteriores; ante discrepancias, usamos las bases actuales del organizador. No se ha accedido al dashboard privado ni presentado una inscripción.

## Requisitos que condicionan el proyecto

- Integrar **Zetaris y Meterless**, y usar **Cursor** en el desarrollo (regla 5.1). El código generado está permitido. Las bases admiten distintos modelos; nosotros elegimos Nemotron, que además tiene un premio específico.
- Equipos de 1 a 5 personas y un único track principal. Declarar cualquier componente de producto previo; se valora el trabajo nuevo.
- Entregar vídeo de 1–4 minutos, presentación, repositorio GitHub con código y README, y explicación concreta de la contribución de los patrocinadores y del uso de Cursor.
- Puntuación: impacto 30, técnica 20, innovación 15, demo 15, producto/UX 10, tecnologías patrocinadoras 10.
- Inscripción: 22 de octubre a las 23:59 UTC, **23 de octubre a la 01:59 en Madrid**. Entrega: 27 de octubre a las 23:45 UTC, **28 de octubre a las 00:45 en Madrid**. El cambio de hora del día 25 está contemplado. Verificar avisos del organizador antes de entregar.

## Track propuesto

**Wildcard / Tinkerer**, por partir de la idea de un producto existente. La candidatura todavía no se ha registrado ni se ha elegido un track en la plataforma. La propuesta se centra en recomendaciones explicables, así que también tiene afinidad temática con “The Agent That Can Explain Why”; el track final debe quedar reflejado en la entrega.

Declaración propuesta: “Cora es una idea de producto preexistente de OVEUN. Cora Atlas se ha escrito desde cero durante la ventana del hackatón. No incorpora código, datos ni servicios del producto Cora. La extracción, interfaz, conectores y flujo de comparación de esta entrega son nuevos.” No declarar uso de Cursor ni integración real con patrocinadores hasta contar con evidencias.

## Qué aporta esta base

Problema: comparar una oferta con CVs consume tiempo y suele dejar poco rastro de por qué se propone a alguien. Atlas presenta recomendaciones cualitativas y citas verificables para apoyar a un reclutador. La selección final sigue siendo humana.

La app prepara el flujo de trabajo, documentos, vacantes, trazabilidad e interfaz. Nemotron interpreta y recomienda. La app verifica identificadores, cobertura y citas; no implementa un motor de compatibilidad. Zetaris puede aportar candidatos desde una vista federada; Meterless puede ejecutar el flujo mediante su runtime.

## Estado de cumplimiento

| Elemento | Estado real |
| --- | --- |
| Carpeta y repositorio independientes | Preparados |
| Interfaz, carga de documentos, vacantes e historial | Implementados y comprobados localmente |
| Interpretación/recomendación en la IA, sin porcentajes | Flujo implementado, pruebas con proveedor simulado |
| NVIDIA Nemotron en servicio real | Pendiente de clave y prueba real |
| Meterless | Adaptador de proveedor implementado; falta instalar/conectar runtime y probar |
| Zetaris | Adaptador Trino implementado; falta confirmar endpoint, crear vista y probar |
| Desarrollo en Cursor | Pendiente; esta primera base se ha desarrollado desde Codex desktop |
| Vídeo, presentación y formulario de entrega | Pendientes, fuera de esta primera base |

## Próxima demostración

1. Abrir la carpeta en Cursor y realizar una mejora real del proyecto; conservar commit y evidencia de ese trabajo.
2. Preparar datos completamente ficticios en dos fuentes de Zetaris y una vista compatible. Importarlos en Atlas y mostrar el origen.
3. Conectar Nightshift a Nemotron; comprobar el proveedor y ejecutar el análisis. Guardar evidencia del modelo real y de la ejecución por Meterless.
4. Mostrar una cita literal de un candidato y una laguna de otro. Contrastar con los documentos y guardar una propuesta de entrevista desde la revisión humana.
5. Medir duración y calidad sobre un conjunto sintético anotado. No presentar beneficios o precisión numérica sin medición.
6. Grabar el flujo en 1–4 minutos. Preparar diapositivas con problema/usuarios, solución, arquitectura, stack, patrocinadores, aportación propia, capturas y evolución prevista. Revisar acceso del jurado al repositorio privado y completar el formulario.

## Fuentes técnicas

- [NVIDIA Nemotron 3.5 Super VL y generación de clave](https://build.nvidia.com/nvidia/nemotron-3.5-super-vl-120b-a12b)
- [Contrato de proveedor de Meterless Nightshift](https://github.com/Meterless/Meterless/blob/main/docs/agent-ready/add-meterless-provider.md)
- [Zetaris Cloud: acceso mediante motores Spark/Trino y federación](https://www.zetaris.com/cloud)
- [Protocolo HTTP de Trino](https://trino.io/docs/current/develop/client-protocol.html)
- [API SaaS de Zetaris: protocolo distinto del adaptador Trino](https://kbase.zetaris.com/knowledge/accessing-zetaris-using-api)
- [Codex en Cursor, documentación oficial de OpenAI](https://learn.chatgpt.com/docs/codex/ide)
