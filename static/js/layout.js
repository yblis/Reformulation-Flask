document.addEventListener('DOMContentLoaded', function() {
    const reformulationTab = document.getElementById('reformulation');
    const sections = [
        { id: 'input-section', element: document.querySelector('.row.g-4.mb-4') },
        { id: 'options-section', element: document.querySelector('.card.mb-4') },
        { id: 'action-section', element: document.getElementById('reformulateBtn').parentElement },
        { id: 'output-section', element: document.querySelector('.card.mb-4:last-of-type') }
    ];

    // Add drag handles and make sections draggable
    sections.forEach(section => {
        if (section.element) {
            section.element.classList.add('draggable-section', 'drop-zone');
            section.element.setAttribute('draggable', true);
            section.element.setAttribute('data-section-id', section.id);

            // Add drag handle
            const handle = document.createElement('div');
            handle.className = 'drag-handle';
            handle.innerHTML = '<i class="bi bi-grip-horizontal"></i>';
            section.element.insertBefore(handle, section.element.firstChild);
        }
    });

    // Load saved section order
    function loadSectionOrder() {
        const savedOrder = localStorage.getItem('sectionOrder');
        if (savedOrder) {
            try {
                const orderArray = JSON.parse(savedOrder);
                const container = reformulationTab;
                orderArray.forEach(sectionId => {
                    const section = sections.find(s => s.id === sectionId);
                    if (section && section.element) {
                        container.appendChild(section.element);
                    }
                });
            } catch (error) {
                console.error('Error loading section order:', error);
            }
        }
    }

    // Save current section order
    function saveSectionOrder() {
        const currentOrder = Array.from(reformulationTab.children)
            .filter(el => el.hasAttribute('data-section-id'))
            .map(el => el.getAttribute('data-section-id'));
        localStorage.setItem('sectionOrder', JSON.stringify(currentOrder));
    }

    // Drag and drop event handlers
    let draggedElement = null;

    reformulationTab.addEventListener('dragstart', (e) => {
        const section = e.target.closest('.draggable-section');
        if (section) {
            draggedElement = section;
            section.classList.add('dragging');
            e.dataTransfer.setData('text/plain', section.getAttribute('data-section-id'));
        }
    });

    reformulationTab.addEventListener('dragend', (e) => {
        const section = e.target.closest('.draggable-section');
        if (section) {
            section.classList.remove('dragging');
            draggedElement = null;
            saveSectionOrder();
        }
    });

    reformulationTab.addEventListener('dragover', (e) => {
        e.preventDefault();
        const section = e.target.closest('.draggable-section');
        if (section && section !== draggedElement) {
            const rect = section.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            if (e.clientY < midY) {
                section.parentNode.insertBefore(draggedElement, section);
            } else {
                section.parentNode.insertBefore(draggedElement, section.nextSibling);
            }
        }
    });

    reformulationTab.addEventListener('dragenter', (e) => {
        e.preventDefault();
        const section = e.target.closest('.draggable-section');
        if (section && section !== draggedElement) {
            section.classList.add('drag-over');
        }
    });

    reformulationTab.addEventListener('dragleave', (e) => {
        const section = e.target.closest('.draggable-section');
        if (section) {
            section.classList.remove('drag-over');
        }
    });

    reformulationTab.addEventListener('drop', (e) => {
        e.preventDefault();
        const sections = document.querySelectorAll('.draggable-section');
        sections.forEach(section => section.classList.remove('drag-over'));
    });

    // Initialize layout
    loadSectionOrder();
});
