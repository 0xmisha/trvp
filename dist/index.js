"use strict";
function toggleModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        if (modal.classList.toggle('hidden')) {
            const content = modal.querySelector('.content');
            content.innerHTML = '';
            const approveBtn = modal.querySelector('#approve');
            approveBtn.remove();
        }
    }
}
async function query(url, method, body, query) {
    const request = await fetch(url + (query ? `?${new URLSearchParams(query).toString()}` : ''), {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!request.ok) {
        throw new Error(await request.text());
    }
    return request;
}
function validateString(str) {
    return str && str.length > 0;
}
async function validateProfile(card) {
    const clients = card.querySelectorAll('.list-client .client-required p:not(.title)');
    const profile = card.querySelector('.manager-profile select');
    const result = Array.from(clients).map(client => {
        return client.getAttribute('value') === profile.value;
    });
    debugger;
    return result.some(value => !value);
}
function addRow(element, options) {
    element.classList.add(options.className);
    let p = element.appendChild(document.createElement('p'));
    p.innerText = options.name;
    p.classList.add('title');
    p = element.appendChild(document.createElement('p'));
    p.innerText = options.value;
    return p;
}
function addInput(element, options) {
    const container = document.createElement('div');
    container.classList.add(...options.classes);
    const label = document.createElement('label');
    label.htmlFor = options.label + options.uuid;
    label.innerText = options.labelName;
    const input = document.createElement('input');
    input.type = options.type;
    input.id = options.label + options.uuid;
    input.value = options.value ? options.value : '';
    container.appendChild(label);
    container.appendChild(input);
    element.appendChild(container);
    return input;
}
function addSelect(element, options) {
    const container = document.createElement('div');
    container.classList.add(...options.classes);
    const label = document.createElement('label');
    label.htmlFor = options.label + options.uuid;
    label.innerText = options.labelName;
    const select = document.createElement('select');
    select.id = options.label + options.uuid;
    const mainOption = document.createElement('option');
    mainOption.innerText = options.mainOption;
    mainOption.disabled = true;
    select.appendChild(mainOption);
    container.appendChild(label);
    container.appendChild(select);
    element.appendChild(container);
    return select;
}
async function addSelectSql(element, options) {
    const select = addSelect(element, options);
    const result = await query(options.query.url, options.query.method, options.query.body, options.query.query);
    const rows = await result.json();
    for (const row of rows) {
        const option = document.createElement('option');
        option.innerText = row.value;
        option.value = row.id;
        select.appendChild(option);
        if (row.value === options.value) {
            select.value = row.id;
        }
    }
    return select;
}
async function addClients(li, listCont, clientsIds) {
    if (clientsIds && clientsIds.length > 0) {
        let result;
        let row;
        for (const clientId of clientsIds) {
            result = await query('client', 'GET', undefined, { id: clientId });
            row = await result.json();
            await addClient(li, listCont, row[0]);
        }
    }
}
function validateCount(li) {
    return +li.getAttribute('clients-last-count') - 1 >= 0;
}
async function addClient(li, listCont, options) {
    const listClient = document.createElement('div');
    listClient.classList.add('list-client');
    listClient.setAttribute('edited', 'false');
    if (!options) {
        listClient.classList.add('editable');
    }
    else {
        listClient.id = options.id;
    }
    const id = options ? options.id : crypto.randomUUID();
    const clientId = listClient.appendChild(document.createElement('div'));
    clientId.classList.add('client-id');
    clientId.innerHTML = `<p class="title">ID: ${id}</p>`;
    const clientName = listClient.appendChild(document.createElement('div'));
    clientName.classList.add('client-name');
    clientName.innerHTML = '<p class="title">Клиент:</p>';
    const clientNameInput = addInput(clientName, {
        uuid: id,
        classes: ['inp'],
        label: 'name',
        labelName: '',
        type: 'text'
    });
    clientNameInput.addEventListener('change', () => {
        listClient.setAttribute('edited', 'true');
    });
    const clientNameP = clientName.appendChild(document.createElement('p'));
    if (options && options.name) {
        clientNameP.innerText = options.name;
        clientNameInput.value = options.name;
    }
    clientNameP.setAttribute('value', clientNameInput.value);
    const clientRequired = listClient.appendChild(document.createElement('div'));
    clientRequired.classList.add('client-required');
    clientRequired.innerHTML = '<p class="title">Требуемый профиль:</p>';
    const clientRequiredSelect = await addSelectSql(clientRequired, {
        classes: ['inp'],
        label: 'required',
        labelName: '',
        mainOption: 'Профиль',
        query: {
            url: '/profile',
            method: 'GET'
        },
        value: options === null || options === void 0 ? void 0 : options.required_profile
    });
    clientRequiredSelect.addEventListener('change', () => {
        listClient.setAttribute('edited', 'true');
    });
    const clientRequiredP = clientRequired.appendChild(document.createElement('p'));
    if (options && options.required_profile) {
        clientRequiredSelect.value = options.required_profile;
        clientRequiredP.innerText = clientRequiredSelect.options[clientRequiredSelect.selectedIndex].text;
    }
    clientRequiredP.setAttribute('value', clientRequiredSelect.value);
    const clientButtons = listClient.appendChild(document.createElement('div'));
    clientButtons.classList.add('client-buttons');
    const buttonEdit = clientButtons.appendChild(document.createElement('img'));
    buttonEdit.src = "../assets/edit.svg";
    buttonEdit.alt = "Edit";
    buttonEdit.addEventListener('click', () => {
        clientNameInput.value = clientNameP.getAttribute('value');
        clientRequiredSelect.value = clientRequiredP.getAttribute('value');
        listClient.classList.add('editable');
        buttonEdit.classList.toggle('hidden');
        buttonDelete.classList.toggle('hidden');
        buttonApprove.classList.toggle('hidden');
        buttonCancel.classList.toggle('hidden');
    });
    const buttonDelete = clientButtons.appendChild(document.createElement('img'));
    buttonDelete.src = "../assets/delete-button.svg";
    buttonDelete.alt = "Delete";
    buttonDelete.addEventListener('click', async () => {
        const card = listClient.parentElement.parentElement.parentElement;
        await query('manager', 'POST', {
            clientId: id,
            remove: true,
            client: {
                remove: true
            }
        }, {
            id: card.id,
            clientId: id
        });
        card.setAttribute('clients-last-count', (+card.getAttribute('clients-last-count') + 1).toString());
        card.querySelector('.clients-last-count').textContent = card.getAttribute('clients-last-count');
        listClient.remove();
    });
    const buttonApprove = clientButtons.appendChild(document.createElement('img'));
    buttonApprove.src = "../assets/approve.png";
    buttonApprove.alt = "Approve";
    buttonApprove.addEventListener('click', async () => {
        const card = listClient.parentElement.parentElement.parentElement;
        if (!validateString(clientNameInput.value)) {
            const text = clientNameInput.parentElement.previousElementSibling.textContent;
            alert(`Не заполнено поле ${text.trim().slice(0, text.length - 1)}`);
            return;
        }
        const profileId = li.querySelector('.manager-profile p:not(.title)').getAttribute('value');
        if (profileId !== clientRequiredSelect.value) {
            alert('Профиль клиента не соответствует профилю менеджера');
            return;
        }
        if (listClient.getAttribute('edited') === 'true') {
            const card = listClient.parentElement.parentElement.parentElement;
            if (listClient.id) {
                await query('client', 'POST', {
                    name: clientNameInput.value,
                    required: clientRequiredSelect.value
                }, {
                    id: id
                });
            }
            else {
                let validationResult;
                validationResult = validateCount(card);
                if (!validationResult) {
                    alert(`Достигнуто максимальное количество клиентов`);
                    return;
                }
                await query('manager', 'POST', {
                    clientId: id,
                    client: {
                        id: id,
                        name: clientNameInput.value,
                        required: clientRequiredSelect.value
                    }
                }, {
                    id: card.id,
                    clientId: id
                });
                card.setAttribute('clients-last-count', (+card.getAttribute('clients-last-count') - 1).toString());
            }
            clientNameP.innerText = clientNameInput.value;
            clientRequiredP.innerText = clientRequiredSelect.selectedOptions[0].text;
            clientNameP.setAttribute('value', clientNameInput.value);
            clientRequiredP.setAttribute('value', clientRequiredSelect.value);
            card.querySelector('.clients-last-count').textContent = card.getAttribute('clients-last-count');
            listClient.id = id;
            enableDragAndDropListClient(listClient);
        }
        listClient.classList.remove('editable');
        listClient.setAttribute('edited', 'false');
        buttonEdit.classList.toggle('hidden');
        buttonDelete.classList.toggle('hidden');
        buttonApprove.classList.toggle('hidden');
        buttonCancel.classList.toggle('hidden');
    });
    const buttonCancel = clientButtons.appendChild(document.createElement('img'));
    buttonCancel.src = "../assets/cancel.png";
    buttonCancel.alt = "Cancel";
    buttonCancel.addEventListener('click', () => {
        if (listClient.id) {
            listClient.classList.remove('editable');
            clientNameInput.value = clientNameP.getAttribute('value');
            clientRequiredSelect.value = clientRequiredP.getAttribute('value');
            buttonEdit.classList.toggle('hidden');
            buttonDelete.classList.toggle('hidden');
            buttonApprove.classList.toggle('hidden');
            buttonCancel.classList.toggle('hidden');
        }
        else {
            listClient.remove();
        }
    });
    if (options) {
        buttonApprove.classList.add('hidden');
        buttonCancel.classList.add('hidden');
        li.setAttribute('clients-last-count', (+li.getAttribute('clients-last-count') - 1).toString());
    }
    else {
        buttonEdit.classList.add('hidden');
        buttonDelete.classList.add('hidden');
    }
    listCont.appendChild(listClient);
}
async function createListElement(options) {
    const list = document.querySelector('.cards-list');
    const li = document.createElement('li');
    li.classList.add('card');
    li.id = options.id;
    li.setAttribute('clients-last-count', (options.max_size).toString());
    const id = document.createElement('div');
    id.innerText = `ID: ${options.id}`;
    li.appendChild(id);
    const mainInfo = document.createElement('div');
    mainInfo.classList.add('main-info');
    let p = mainInfo.appendChild(document.createElement('p'));
    p.innerText = 'Основная информация';
    const buttonsMain = document.createElement('div');
    buttonsMain.classList.add('buttons');
    const buttonEdit = buttonsMain.appendChild(document.createElement('img'));
    buttonEdit.src = '../assets/edit.svg';
    buttonEdit.alt = 'Edit';
    buttonEdit.addEventListener('click', () => {
        info.classList.toggle('editable');
        buttonEdit.classList.toggle('hidden');
        buttonApprove.classList.toggle('hidden');
        buttonCancel.classList.toggle('hidden');
    });
    const buttonApprove = buttonsMain.appendChild(document.createElement('img'));
    buttonApprove.src = '../assets/approve.png';
    buttonApprove.alt = 'Approve';
    buttonApprove.classList.add('hidden');
    buttonApprove.addEventListener('click', async () => {
        if (!validateString(fullnameInput.value)) {
            alert(`Необходимо ввести ФИО.`);
            return;
        }
        if (info.getAttribute('edited') === 'true') {
            if (await validateProfile(li)) {
                alert('Невозможно поменять профиль');
                return;
            }
            await query('manager', 'POST', {
                profile: profileSelect.value,
                fullname: fullnameInput.value,
                max_size: +maxsizeInput.value
            }, {
                id: options.id
            });
            profileP.innerText = profileSelect.options[profileSelect.selectedIndex].text;
            fullnameP.innerText = fullnameInput.value;
            maxsizeP.innerText = maxsizeInput.value;
            profileP.setAttribute('value', profileSelect.value);
            fullnameP.setAttribute('value', fullnameInput.value);
            maxsizeP.setAttribute('value', maxsizeInput.value);
            li.setAttribute('clients-last-count', (options.max_size).toString());
            li.querySelector('.clients-last-count').textContent = li.getAttribute('clients-last-count');
        }
        info.setAttribute('edited', 'false');
        info.classList.toggle('editable');
        buttonEdit.classList.toggle('hidden');
        buttonApprove.classList.toggle('hidden');
        buttonCancel.classList.toggle('hidden');
    });
    const buttonCancel = buttonsMain.appendChild(document.createElement('img'));
    buttonCancel.src = '../assets/cancel.png';
    buttonCancel.alt = 'Cancel';
    buttonCancel.classList.add('hidden');
    buttonCancel.addEventListener('click', () => {
        info.classList.toggle('editable');
        if (info.getAttribute('edited') === 'true') {
            profileSelect.value = profileP.getAttribute('value');
            fullnameInput.value = fullnameP.getAttribute('value');
            maxsizeInput.value = maxsizeP.getAttribute('value');
        }
        buttonEdit.classList.toggle('hidden');
        buttonApprove.classList.toggle('hidden');
        buttonCancel.classList.toggle('hidden');
    });
    mainInfo.appendChild(buttonsMain);
    li.appendChild(mainInfo);
    const info = document.createElement('div');
    info.classList.add('info');
    info.setAttribute('edited', 'false');
    const fullname = document.createElement('div');
    const fullnameP = addRow(fullname, {
        name: 'ФИО',
        value: options.fullname,
        className: 'manager-fullname'
    });
    const fullnameInput = addInput(fullname, {
        uuid: options.id,
        classes: ['inp'],
        label: 'fullname',
        labelName: '',
        type: 'text',
        value: options.fullname
    });
    fullnameP.setAttribute('value', fullnameInput.value);
    fullnameInput.addEventListener('change', () => {
        info.setAttribute('edited', 'true');
    });
    info.appendChild(fullname);
    const profile = document.createElement('div');
    const profileP = addRow(profile, {
        name: 'Профиль',
        value: options.profile,
        className: 'manager-profile'
    });
    const profileSelect = await addSelectSql(profile, {
        uuid: options.id,
        classes: ['inp'],
        label: 'profile',
        labelName: '',
        mainOption: 'Профиль',
        query: {
            url: '/profile',
            method: 'GET'
        },
        value: options.profile,
    });
    profileP.setAttribute('value', profileSelect.value);
    profileSelect.addEventListener('change', () => {
        info.setAttribute('edited', 'true');
    });
    info.appendChild(profile);
    const maxsize = document.createElement('div');
    const maxsizeP = addRow(maxsize, {
        name: 'Макс. клиентов',
        value: options.fullname,
        className: 'manager-maxsize'
    });
    const maxsizeInput = addInput(maxsize, {
        uuid: options.id,
        classes: ['inp'],
        label: 'maxsize',
        labelName: '',
        type: 'number',
        value: String(options.max_size)
    });
    maxsizeP.setAttribute('value', maxsizeInput.value);
    maxsizeInput.addEventListener('change', () => {
        info.setAttribute('edited', 'true');
    });
    info.appendChild(fullname);
    const clientsCount = document.createElement('div');
    clientsCount.classList.add('not-editable');
    const clientsCountP = clientsCount.appendChild(document.createElement('p'));
    clientsCountP.classList.add('title');
    clientsCountP.innerText = 'Оставшееся место';
    p = clientsCount.appendChild(document.createElement('p'));
    p.classList.add('clients-last-count');
    info.appendChild(clientsCount);
    li.appendChild(info);
    const cardList = li.appendChild(document.createElement('div'));
    cardList.classList.add('card-list');
    const cardListP = cardList.appendChild(document.createElement('p'));
    cardListP.innerHTML = 'Список клиентов:';
    const listCont = cardList.appendChild(document.createElement('div'));
    listCont.classList.add('list-cont');
    const addBtn = li.appendChild(document.createElement('button'));
    addBtn.classList.add('add-card-btn');
    addBtn.innerText = 'Добавить клиента';
    addBtn.addEventListener('click', () => {
        addClient(li, listCont);
    });
    const deleteBtn = li.appendChild(document.createElement('button'));
    deleteBtn.classList.add('delete-card-btn');
    deleteBtn.innerText = 'Убрать менеджера';
    deleteBtn.addEventListener('click', async () => {
        await query('manager', 'DELETE', undefined, { id: li.id });
        li.remove();
    });
    await addClients(li, listCont, options.clients);
    li.querySelector('.clients-last-count').innerText = li.getAttribute('clients-last-count');
    list.insertBefore(li, list.lastElementChild);
    return li;
}
async function addListElement() {
    const modal = document.querySelector('.modal');
    if (modal) {
        const content = modal.querySelector('.content');
        const profile = await addSelectSql(content, {
            classes: ['title'],
            label: 'profile',
            labelName: 'Профиль',
            mainOption: 'Профиль',
            query: {
                url: '/profile',
                method: 'GET'
            },
        });
        const fullname = addInput(content, {
            classes: ['title'],
            label: 'fullname',
            labelName: 'ФИО',
            type: 'text'
        });
        const maxsize = addInput(content, {
            classes: ['title'],
            label: 'maxsize',
            labelName: 'Макс. клиентов',
            type: 'number'
        });
        async function createNewListElement() {
            const uuid = crypto.randomUUID();
            await query('/manager', 'PUT', {
                id: uuid,
                fullname: fullname.value,
                profile: profile.value,
                max_size: maxsize.value
            });
            const li = await createListElement({
                id: uuid,
                fullname: fullname.value,
                profile: profile.options[profile.selectedIndex].text,
                max_size: Number(maxsize.value),
                clients: []
            });
            enableDragAndDropCard(li);
        }
        const modalButtons = modal.querySelector('.modal-buttons');
        const approveBtn = document.createElement('img');
        approveBtn.src = '../assets/approve.png';
        approveBtn.alt = 'Approve';
        approveBtn.id = 'approve';
        approveBtn.addEventListener('click', () => {
            try {
                createNewListElement();
                toggleModal();
            }
            catch (e) {
                window.alert(e.message);
            }
        });
        modalButtons.insertBefore(approveBtn, modalButtons.firstChild);
        toggleModal();
    }
}
function enableDragAndDropCard(card) {
    card.addEventListener('dragover', (e) => {
        e.preventDefault();
        card.classList.add('drag-over');
    });
    card.addEventListener('dragleave', () => {
        card.classList.remove('drag-over');
    });
    card.addEventListener('drop', async (e) => {
        var _a, _b;
        e.preventDefault();
        card.classList.remove('drag-over');
        const data = (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/plain');
        if (!data)
            return;
        const { clientId, sourceDestination } = JSON.parse(data);
        const draggedClient = document.getElementById(clientId);
        const targetList = card.querySelector('.list-cont');
        const targetDestination = (_b = card.querySelectorAll('.manager-profile p')[1]) === null || _b === void 0 ? void 0 : _b.innerText.trim();
        if (draggedClient && targetList && targetDestination === sourceDestination) {
            const cardId = card.id;
            if (!cardId)
                return;
            let validationResult;
            validationResult = validateCount(card);
            if (!validationResult) {
                alert(`Достигнуто максимальное количество клиентов`);
                return;
            }
            if (!targetList.querySelector('.list-client')) {
                const placeholder = document.createElement('div');
                placeholder.classList.add('list-client-placeholder');
                targetList.appendChild(placeholder);
            }
            const sourceCard = draggedClient.closest('.card');
            const sourceCardId = sourceCard === null || sourceCard === void 0 ? void 0 : sourceCard.id;
            if (sourceCardId) {
                await query('/manager', 'POST', {
                    clientId,
                    remove: true
                }, {
                    id: sourceCardId
                });
            }
            await query('/manager', 'POST', {
                clientId,
            }, {
                id: cardId
            });
            targetList.appendChild(draggedClient);
            const placeholder = targetList.querySelector('.list-client-placeholder');
            if (placeholder)
                placeholder.remove();
            if (sourceCardId) {
                const sourceCard = document.getElementById(sourceCardId);
                sourceCard.setAttribute('clients-last-count', (+sourceCard.getAttribute('clients-last-count') + 1).toString());
                sourceCard.querySelector('.clients-last-count').textContent = sourceCard.getAttribute('clients-last-count');
            }
            card.setAttribute('clients-last-count', (+card.getAttribute('clients-last-count') - 1).toString());
            card.querySelector('.clients-last-count').textContent = card.getAttribute('clients-last-count');
        }
        else {
            alert('Невозможно перенести клиента: несоответствие профилей.');
        }
    });
}
function enableDragAndDropListClient(client) {
    client.draggable = true;
    client.addEventListener('dragstart', (e) => {
        var _a;
        const sourceCard = client.closest('.card');
        const sourceDestination = (_a = sourceCard === null || sourceCard === void 0 ? void 0 : sourceCard.querySelectorAll('.manager-profile p')[1]) === null || _a === void 0 ? void 0 : _a.innerText.trim();
        if (e.dataTransfer && sourceDestination) {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                clientId: client.id,
                sourceDestination
            }));
        }
        client.classList.add('dragging');
    });
    client.addEventListener('dragend', () => {
        client.classList.remove('dragging');
    });
}
function enableDragAndDrop() {
    const listClients = document.querySelectorAll('.list-client');
    listClients.forEach(enableDragAndDropListClient);
    const cards = document.querySelectorAll('.card');
    cards.forEach(enableDragAndDropCard);
}
async function createProfile() {
    const modal = document.querySelector('.modal');
    if (modal) {
        const content = modal.querySelector('.content');
        const id = crypto.randomUUID();
        const idCont = document.createElement('div');
        idCont.innerHTML = `<p>ID: ${id}</p>`;
        content.appendChild(idCont);
        const profileCont = document.createElement('div');
        const profileInput = addInput(profileCont, {
            classes: [],
            label: 'profile',
            labelName: 'Профиль',
            type: 'text'
        });
        content.appendChild(profileCont);
        const modalButtons = modal.querySelector('.modal-buttons');
        const approveBtn = document.createElement('img');
        approveBtn.src = '../assets/approve.png';
        approveBtn.alt = 'Approve';
        approveBtn.id = 'approve';
        approveBtn.addEventListener('click', async () => {
            if (!validateString(profileInput.value)) {
                alert(`Не заполнено поле ${profileInput.labels[0].innerText}`);
                return;
            }
            await query('profile', 'PUT', {
                id: id,
                value: profileInput.value,
            });
            const profileSelects = document.querySelectorAll(`[id^='profile']:not(.modal div)`);
            profileSelects.forEach(profileSelect => {
                const option = document.createElement('option');
                option.value = id;
                option.innerText = profileInput.value;
                profileSelect.appendChild(option);
            });
            toggleModal();
        });
        modalButtons.insertBefore(approveBtn, modalButtons.firstChild);
        toggleModal();
    }
}
async function init() {
    const result = await query('allManagers', 'GET');
    const rows = await result.json();
    for (const row of rows) {
        await createListElement(row);
    }
    enableDragAndDrop();
}
