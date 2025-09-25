// Minimal client-side dynamic loading with pagination
let page = 0;
let loading = false;
let done = false;
let type = -1;

async function loadMore(reload) {
    if (reload) done = false;
    if (loading || done) return;
    loading = true;
    const btn = document.getElementById('load-more');
    if (btn) btn.textContent = 'Loading...';
    try {
        let res = await fetch(`/api/userdata.json`, {headers: {'Accept': 'application/json'}});
        if (!res.ok) throw new Error('Failed to load');
        let data = await res.json();
        appendUserData(data)
        res = await fetch(`/api/types.json`, {headers: {'Accept': 'application/json'}});
        if (!res.ok) throw new Error('Failed to load');
        data = await res.json();
        appendFilterData(data)
        res = await fetch(`/api/files/${page}?type=${type}`, {headers: {'Accept': 'application/json'}});
        if (!res.ok) throw new Error('Failed to load');
        data = await res.json(); // expected: { items: [...], nextPage: true/false }
        appendItems(data.items || []);
        page += 1;
        done = data.nextPage === false || (data.items || []).length === 0;
        if (btn) btn.style.display = done ? 'none' : 'inline-block';
    } catch (e) {
        console.error(e);
        if (btn) {
            btn.textContent = 'Retry';
        }
    } finally {
        loading = false;
        const btnEl = document.getElementById('load-more');
        if (btnEl && !done && btnEl.textContent !== 'Retry') btnEl.textContent = 'Load more';
    }
}

function appendItems(items) {
    const container = document.querySelector('.image-preview');
    if (!container) return;
    for (const file of items) {
        const card = document.createElement('div');
        card.style.position = 'relative';

        const a = document.createElement('a');
        a.href = `/zoom#${file.uuid}`;

        const img = document.createElement('img');
        img.src = `/tiles/${file.uuid}/preview.jpg`;
        img.alt = file.description || '';
        img.setAttribute('min-width', '256');
        img.setAttribute('min-height', '256');
        a.appendChild(img);
        card.appendChild(a);

        if (file.type === 1 && file.protected === true) {
            const lock = document.createElement('img');
            lock.src = '/icons/icons8-key.svg';
            lock.alt = 'Protected';
            lock.style.position = 'absolute';
            lock.style.top = '10px';
            lock.style.right = '10px';
            lock.style.width = '20px';
            lock.style.height = '20px';
            card.appendChild(lock);
        }

        const desc = document.createElement('div');
        desc.className = 'description';

        const p1 = document.createElement('p');
        p1.textContent = truncate(file.description || '', 32);
        desc.appendChild(p1);

        const p2 = document.createElement('p');
        p2.textContent = file.type_name;
        desc.appendChild(p2);

        const p3 = document.createElement('p');
        p3.innerHTML = `added by <a href="/profil/${file.uploader || ''}/">${file.uploader || ''}</a>`;
        desc.appendChild(p3);

        const p4 = document.createElement('p');
        p4.textContent = `${file.width || 0} x ${file.height || 0} px`;
        desc.appendChild(p4);

        card.appendChild(desc);
        container.appendChild(card);
    }
}

function appendFilterData(imageTypes) {
    select = document.getElementById('type-filter');
    select.replaceChildren();
    select.innerHTML = "<option>Dowolny</option>"
    imageTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name;
        select.appendChild(option);
    });
}

function appendUserData(userdata) {
    container = document.getElementById("user-info")
    if (!userdata.nickname) {
        container.insertAdjacentHTML('beforeend', '<a href="/login">Login</a>');
    } else {
        container.insertAdjacentHTML('beforeend', `${userdata.nickname}<br>`);
        container.insertAdjacentHTML('beforeend', '<a href="/logout">Logout</a><br>');
        container.insertAdjacentHTML('beforeend', '<a href="/upload">Upload</a>');
    }
}

function truncate(str, n) {
    if (!str) return '';
    return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

function setupInfiniteScroll() {
    const sentinel = document.getElementById('sentinel');
    if (!('IntersectionObserver' in window) || !sentinel) return;
    const io = new IntersectionObserver(entries => {
        for (const e of entries) {
            if (e.isIntersecting) loadMore();
        }
    }, {rootMargin: '400px'});
    io.observe(sentinel);
}

document.addEventListener('DOMContentLoaded', () => {
    loadMore();
    setupInfiniteScroll();
    const btn = document.getElementById('load-more');
    if (btn) btn.addEventListener('click', () => loadMore());

    document.getElementById('type-filter').addEventListener("change", (target) => {
        console.log(target.target.value);
        type=target.target.value;
        loadMore(true);
    })
});