import debounce from "./debounce.js";
class Model {
  #tagList;

  constructor() {
    this.#tagList = [];
  }

  async init() {
    this.#tagList = await this.#getDatabaseTags();
  }

  async addContact(contactInfo) {
    const ADD_CONTACT_URL = '/api/contacts/';
    const HEADERS = {
      'Content-Type': 'application/json',
    };

    try {
      return await fetch(ADD_CONTACT_URL, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(contactInfo),
      }).then(response => { return this.#handleDataUpdateResult(response) });
    } catch (error) {
      return {error: error};
    }
  }

  addTag(tagName) {
    tagName = tagName.toLowerCase();

    if (this.#tagList.includes(tagName)) {
      return {error: true, message: `The tag "${tagName}"  already exists`};
    }

    this.#tagList.push(tagName);
    return {error: false, message: `${tagName} has been added`, tags: this.#tagList.slice()};
  }

  async deleteTag(tagName) {
    const contactsToUpdate = [];
    const contacts = await this.getAllContacts();

    contacts.forEach(contact => {
      if (contact.tags) {
        const tagList = contact.tags.split(',');
        const deletedIndex = tagList.findIndex(tag => tag === tagName);

        if (deletedIndex !== -1) {
          tagList.splice(deletedIndex, 1);

          contact.tags = tagList.join(',');
          contactsToUpdate.push(contact);
        }
      }
    });

    contactsToUpdate.forEach(async contact => {
      await this.updateContact(contact.id, {tags: contact.tags});
    });

    const tagIndexToDelete = this.#tagList.findIndex(tag => tag === tagName);
    this.#tagList.splice(tagIndexToDelete, 1)

    const updatedContacts = await this.getAllContacts();

    return {tags: this.#tagList.slice(), contacts: updatedContacts};
  }

  async filterByTag(tagName) {
    const allContacts = await this.getAllContacts();

    return allContacts.filter(contact => {
      if (!contact.tags) return false;

      const tags = contact.tags.split(',');
      return tags.includes(tagName);
    });
  }

  async getAllContacts() {
    const ALL_CONTACTS_URL = '/api/contacts';

    const response = await fetch(ALL_CONTACTS_URL);
    const allContacts = await response.json();
    return allContacts;
  }

  getAllTags() {
    return this.#tagList.slice();
  }

  async #getDatabaseTags() {
    const allContacts = await this.getAllContacts();

    const tags = allContacts.reduce((tagList, contact) => {
      if (!contact.tags) return tagList;

      contact.tags.split(',').forEach(tag => {
        if (!tagList.includes(tag)) {
          tagList.push(tag);
        }
      });

      return tagList;
    }, []);

    return tags;
  }

  async deleteContact(id) {
    const DELETE_CONTACT_URL = `/api/contacts/${id}`;

    try {
      return await fetch(DELETE_CONTACT_URL, {
        method: 'DELETE',
      }).then(response => { return this.#handleDataUpdateResult(response) });
    } catch (error) {
      return {error: error};
    }
  }

  async #handleDataUpdateResult(response) {
    if (response.ok) {
      return await this.getAllContacts();
    } else {
      return {
        error: true,
        message: `${response.status}: ${response.statusText}`,
      };
    }
  }

  async searchContacts(searchString) {
    const allContacts = await this.getAllContacts();

    return allContacts.filter(contact => contact.full_name.toLowerCase().includes(searchString.toLowerCase()));
  }

  async updateContact(id, updatedContactInfo) {
    const UPDATE_CONTACT_URL = `/api/contacts/${id}`;
    const HEADERS = {
      'Content-Type': 'application/json',
    };

    try {
      return await fetch(UPDATE_CONTACT_URL, {
        method: 'PUT',
        headers: HEADERS,
        body: JSON.stringify(updatedContactInfo),
      }).then(response => { return this.#handleDataUpdateResult(response) });
    } catch (error) {
      return {error: error};
    }
  }
}

class View {
  #templates;
  #addContactForm;
  #contacts;

  constructor() {
    this.#templates = {};
    this.#setUpTemplates();
    this.#addContactForm = document.querySelector('#addContactForm');
    this.#contacts = document.querySelector('#contacts');

    this.#bindAddContactButtonClick();
    this.#bindCancelAddContact();
  }

  bindAddContactSubmit(handler) {
    this.#addContactForm.addEventListener('submit', event => {
      event.preventDefault();

      setTimeout(this.#resetForm.bind(this), 300);
      handler(event.currentTarget);
    });
  }

  bindSearchBarInput(handler) {
    document.querySelector('input').addEventListener('input', event => {
      handler(event);
    });
  }

  bindTagClick(handler) {
    document.querySelector('#tags').addEventListener('click', event => {
      if (event.target.tagName === 'A') {
        event.preventDefault();
        this.#updateTagHighlights(event);

        handler(event);
      }
    });
  }

  #bindAddContactButtonClick(handler) {
    document.querySelector('#addContactButton').addEventListener('click', event => {
      this.#hideContacts();
      this.#renderTagCheckboxes();
      this.#addContactForm.classList.remove('hidden');
    });
  }

  #bindCancelAddContact() {
    document.querySelector('#cancelAddContact').addEventListener('click', event => {
      this.#showContacts();

      this.#resetForm();

      this.#addContactForm.classList.add('hidden');
    });
  }

  #getCurrentTags() {
    return [...document.querySelectorAll('a.tag')].reduce((tagList, anchor) => {
      tagList.push(anchor.getAttribute('data-tagname'));

      return tagList;
    }, []);
  }

  #hideContacts() {
    this.#contacts.classList.add('hidden');
  }

  renderContacts(contacts) {
    this.#addContactForm.classList.add('hidden');
    this.#showContacts();

    document.querySelector('#contacts').innerHTML = this.#templates.contactsTemplate({ contacts: contacts});
  }

  renderTags(tags) {
      document.querySelector('#tags').innerHTML = this.#templates.tagsTemplate({tags: tags});
  }

  #renderTagCheckboxes() {
    document.querySelector('#addContactAvailableTags').innerHTML = this.#templates.addContactTagsTemplate({tags: this.#getCurrentTags()});
  }

  #resetForm() {
    [...this.#addContactForm.querySelectorAll('input')].forEach(input => {
      input.value = '';
    });
  }

  #setUpTemplates() {
    this.#templates.contactsTemplate = Handlebars.compile(document.querySelector('#contactsTemplate').innerHTML);

    this.#templates.tagsTemplate = Handlebars.compile(document.querySelector('#tagsTemplate').innerHTML);

    this.#templates.addContactTagsTemplate = Handlebars.compile(document.querySelector('#addContactTagsTemplate').innerHTML);
  }

  #showContacts() {
    this.#contacts.classList.remove('hidden');
  }

  #updateTagHighlights(event) {
    [...document.querySelectorAll('a.tag')].forEach(tag => {
      if (tag === event.target) {
        tag.classList.toggle('activeFilter');
      } else {
        tag.classList.remove('activeFilter');
      }
    });
  }
}

class Controller {
  #model;
  #view;
  #currentTagFilter;

  constructor() {
    this.#view = new View();
    this.#model = new Model();
    this.#currentTagFilter = null;
    this.#handleSearchBar = debounce(this.#handleSearchBar.bind(this), 300);

    this.#view.bindTagClick(this.#handleTagClick);
    this.#view.bindSearchBarInput(this.#handleSearchBar);
    this.#view.bindAddContactSubmit(this.#handleAddContact);
  }

  async init() {
    await this.#model.init();

    this.#displayAllTags();
    this.#displayAllContacts();
  }

  #constructTagList(formData) {
    const DISREGARDED_KEYS = ['full_name', 'phone_number', 'email'];
    const tags = [];

    for (let key of formData.keys()) {
      if (!DISREGARDED_KEYS.includes(key)) {
        tags.push(key);
      }
    }

    if (tags.length === 0) {
      return '';
    } else {
      return tags.join(',');
    }
  }

  #handleAddContact = async (form) => {
    const formData = new FormData(form);

    const newContact = {
      full_name: formData.get('full_name'),
      phone_number: formData.get('phone_number'),
      email: formData.get('email'),
      tags: this.#constructTagList(formData),
    };

    const updatedContacts = await this.#model.addContact(newContact);
    this.#displayAllContacts();
  }

  #handleSearchBar = (event) => {
    this.#model.searchContacts(event.target.value).then(searchResults => {
      searchResults = this.#splitContactTags(searchResults);

      this.#view.renderContacts(searchResults);
    });
  }

  #handleTagClick = (event) => {
    const tagName = event.target.getAttribute('data-tagName');

    if (this.#currentTagFilter === tagName) {
      this.#currentTagFilter = null;
      this.#displayAllContacts();
    } else {
      this.#currentTagFilter = tagName;
      const filteredContacts = this.#model.filterByTag(tagName);

      filteredContacts.then(filteredContacts => {
        filteredContacts = this.#splitContactTags(filteredContacts);

        this.#view.renderContacts(filteredContacts);
      });
    }
  }

  #displayAllContacts() {
    const allContacts = this.#model.getAllContacts();

    allContacts.then(contacts => {
      contacts = this.#splitContactTags(contacts);

      this.#view.renderContacts(contacts);
    })
  }

  #displayAllTags() {
    const allTags = this.#model.getAllTags();

    this.#view.renderTags(allTags);
  }

  #splitContactTags(contacts) {
    return contacts.map(contact => {
      if (contact.tags) {
        contact.tags = contact.tags.split(',');
      }

      return contact;
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded!');
  // let model = new Model();
  // let view = new View();

  // model.addTag('dog');
  // model.addTag('frog');
  // model.addTag('work');
  // model.addTag('friend');
  // model.addTag('investigator');
  // const tags = model.addTag('icon').tags;

  // view.renderTags(tags);

  new Controller().init();

  // model.getAllContacts().then(contacts => {
  //   contacts = contacts.map(contact => {
  //     if (contact.tags) {
  //       contact.tags = contact.tags.split(',');
  //     }

  //     return contact;
  //   });

  //   view.renderContacts(contacts);


  // });

  // view.renderContacts(model.getAllContacts());

  // model.addContact({
  //   full_name: "Kermit the Frog",
  //   email: "green@kermitthefrog.com",
  //   phone_number: "12345",
  //   tags: "performer,icon,legend,frog",
  // }).then(response => console.log(response));

  // model.getAllContacts().then(response => console.log(`response is: ${response.forEach(object => console.log(object))}`));

  // model.deleteContact(14).then(response => response.forEach(contact => console.log(contact)));

//   model.searchContacts('I').then(response => response.forEach(contact => console.log(contact)));

//   model.searchContacts('n').then(response => response.forEach(contact => console.log(contact)));

// model.updateContact(4, {
//   full_name: 'Scooby-Doo',
//   phone_number: '119',
//   email: 'scoobz@zoinks.com',
//   tags: 'investigator,dog,icon,star',
// }).then(response => response.forEach(contact => console.log(contact)));

// console.log(model.addTag('investigator'));
// console.log(model.addTag('actor'));
// console.log(model.addTag('icon'));
// console.log(model.addTag('engineering'));
// console.log(model.addTag('DOG'));

// model.filterByTag('work').then(response => console.log(response));

// model.filterByTag('friend').then(response => console.log(response));

// model.filterByTag('dog').then(response => console.log(response));

// console.log(model.addTag('silly'));
// console.log(model.addTag('goose'));
// console.log(model.addTag('frog'));
// model.deleteTag('frog').then(response => console.log(response));
});
