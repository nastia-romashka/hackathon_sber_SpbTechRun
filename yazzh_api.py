import requests
from typing import List, Dict, Any

geo_api = "https://yazzh-geo.gate.petersburg.ru/api/v2"
main_api = "https://yazzh.gate.petersburg.ru"

# Определение id здания по адресу (вспомогательная ф)
def get_building_id_by_address(user_address: str):
    address_search = requests.get(
        f"{geo_api}/geo/buildings/search/",
        params={
            "query": user_address,
            "count": 5,
            "region_of_search": "78"
        },
        headers={"region": "78"}
    )

    result = address_search.json()
    data = result.get("data", [])

    if not data:
        return None
    else:
        first_building = data[0]
        building_id = first_building["id"]
        return building_id


# Нахождение МФЦ по адресу пользователя
# входной параметр, например "Невский проспект 1"
def find_nearest_mfc(user_address: str):
    # 1. Найти building_id по адресу
    building_id = get_building_id_by_address(user_address)
    if building_id is None:
        return None

    # 2. Найти МФЦ рядом с домом
    mfc_info = requests.get(
        f"{main_api}/mfc/",
        params={"id_building": building_id},
        headers={"region": "78"}
    )

    if mfc_info.status_code != 200:
        print(f"код ошибки {mfc_info.status_code}")
        return

    mfc = mfc_info.json()
    # ВЫОВОДИМАЯ ИНФОРМАЦИЯ:
    return {
        "name": mfc["name"],
        "address": mfc["address"],
        "metro": mfc["nearest_metro"],
        "phones": mfc["phone"],
        "hours": mfc["working_hours"],
        "coords": mfc["coordinates"],
        "link": mfc["link"],
        "chat_bot": mfc["chat_bot"]}

# поиск мфц по району
# входной параметр, например "Приморский"
def get_mfc_by_district(district: str):
    resp = requests.get(
        f"{main_api}/mfc/district/",
        params={"district": district})
    resp.raise_for_status()

    if resp.status_code != 200:
        print(f"код ошибки {resp.status_code}")
        return

    json_data = resp.json()
    items = json_data.get("data", [])

    # ВЫОВОДИМАЯ ИНФОРМАЦИЯ:
    result: List[Dict[str, Any]] = [json_data["count"]]
    for item in items:
        result.append(
            {
                "name": item.get("name"),
                "address": item.get("address"),
                "hours": item.get("working_hours"),
            }
        )
    return result

# Ищет поликлиники по адресу пользователя.
# входной параметр, например "Комендантский проспект 61"
def get_polyclinics_by_address(user_address: str):
    # 1. получаем building_id
    building_id = get_building_id_by_address(user_address)
    if building_id is None:
        return None

    response = requests.get(
        f"{main_api}/polyclinics/",
        params={"id": building_id},
        headers={"region": "78"},
    )

    # Случай, когда по адресу нет поликлиник: 204 No Content
    if response.status_code != 200:
        print(f"код ошибки {response.status_code}")
        return

    polyclinics = response.json()

    # ВЫОВОДИМАЯ ИНФОРМАЦИЯ:
    result = []
    for clinic in polyclinics:
        result.append({
            "name": clinic.get("clinic_name"),
            "address": clinic.get("clinic_address"),
            "phones": clinic.get("phone", []),
            "url": clinic.get("url"),
        })
    return result

# Выводит список школ по району
# входной параметр, например "Центральный"
def get_schools_by_district(uses_district: str):
    resp = requests.get(f"{main_api}/school/map/")
    resp.raise_for_status()

    if resp.status_code != 200:
        print(f"код ошибки {resp.status_code}")
        return

    data = resp.json()
    schools = data["data"]

    schools_on_district = [
        s for s in schools
        if s.get("district") == uses_district
    ]
    # ВЫОВОДИМАЯ ИНФОРМАЦИЯ: полная инфа о школах в json
    return schools_on_district

# Ищет ближайшую школу по адресу
# входной параметр, например "Комендантский проспект 61"
def get_linked_schools(user_address: str):
    # 1. получаем building_id
    building_id = get_building_id_by_address(user_address)
    if building_id is None:
        return None

    url = requests.get(f"{main_api}/school/linked/{building_id}")

    if url.status_code != 200:
        print(f"код ошибки {url.status_code}")
        return

    data = url.json()
    # ВЫОВОДИМАЯ ИНФОРМАЦИЯ: полная инфа в json
    return data

# Получить детские сады по фильтрам (район, возраст ребенка в годах, возраст ребенка в месяцах)
# входные параметры, например: district="Приморский", age_year=3
def get_dou(district, age_year: int = 0, age_month: int = 0):
    params = {
        "district": district,
        "legal_form": "Государственная",
        "age_year": age_year,
        "age_month": age_month,
        "doo_status": "Функционирует",
    }

    resp = requests.get(f"{main_api}/dou/", params=params)
    resp.raise_for_status()
    if resp.status_code != 200:
        print(f"код ошибки {resp.status_code}")
        return
    data = resp.json()
    # ВЫОВОДИМАЯ ИНФОРМАЦИЯ: полная инфа в json
    return data

#----------------пенсия---------------
#список всех категорий кружков для пенсионеров
def pensioner_servis_category():
    resp = requests.get(f"{main_api}/pensioner/services/category/")
    resp.raise_for_status()
    if resp.status_code != 200:
        print(f"код ошибки {resp.status_code}")
        return
    data = resp.json()
    # ВЫОВОДИМАЯ ИНФОРМАЦИЯ: полная инфа в json:
    #'Вокал', 'Здоровье', 'Иностранные языки', 'Клубы по интересам', 'Компьютерные курсы', 'Мероприятия', 'Рукоделие', 'Спорт', 'Танцы'
    return data

# Получить Перечень кружгов досуга для пенсионеров по фильтрам(район и категория)
# входные параметры, например: ("Приморский", "Здоровье")
#Категория, допускается множественный выбор категорий, через запятую без пробела
def pensioner_servis(district, category = ""):
    if isinstance(category, (list, tuple, set)):
        category_str = ",".join(str(c).strip() for c in category)
    else:
        category_str = str(category).strip()

    params = {
        "district": district,
        "category": category_str,
        "count": 21,
        "page": 1,
    }

    resp = requests.get(f"{main_api}/pensioner/services/", params=params)
    if resp.status_code != 200:
        print(f"код ошибки {resp.status_code}")
        return
    data = resp.json()
    # ВЫОВОДИМАЯ ИНФОРМАЦИЯ: полная инфа в json
    return data

#--------------афиша--------
# Получить список всех категорий событий по дате
# по умолчанию входные параметры: start_date(формат: 2025-11-21T00:00:00), end_date(формат: 2025-12-22T00:00:00)
def afisha_all_category(start_date: str, end_date: str):
    params = {
        "start_date": start_date,
        "end_date": end_date,
    }

    resp = requests.get(f"{main_api}/afisha/category/all/", params=params)
    resp.raise_for_status()
    if resp.status_code != 200:
        print(f"код ошибки {resp.status_code}")
        return
    data = resp.json()
    # ВЫОВОДИМАЯ ИНФОРМАЦИЯ: полная инфа в json
    return data

# Получить список событий из афиши по дате
# входные параметры: start_date(формат: 2025-11-21T00:00:00), end_date(формат: 2025-12-22T00:00:00)
def afisha_all(start_date: str, end_date: str, categoria: str = "", kids: bool = None, free: bool = None):
    params = {
        "start_date": start_date,
        "end_date": end_date,
        "categoria": categoria,
        "kids": kids,
        "free": free,
    }

    resp = requests.get(f"{main_api}/afisha/all/", params=params)
    resp.raise_for_status()
    if resp.status_code != 200:
        print(f"код ошибки {resp.status_code}")
        return
    data = resp.json()
    # ВЫОВОДИМАЯ ИНФОРМАЦИЯ: полная инфа в json
    return data

#---------------красивые места------------
#получение списка областей и их районв
def get_beautiful_places_area():
    resp = requests.get(f"{main_api}/beautiful_places/area/")
    resp.raise_for_status()
    if resp.status_code != 200:
        print(f"код ошибки {resp.status_code}")
        return
    data = resp.json()
    # ВЫОВОДИМАЯ ИНФОРМАЦИЯ: полная инфа в json:
    return data

#получение списка всех категорий
def get_beautiful_categoria():
    resp = requests.get(f"{main_api}/beautiful_places/categoria/")
    resp.raise_for_status()
    if resp.status_code != 200:
        print(f"код ошибки {resp.status_code}")
        return
    data = resp.json()
    # ВЫОВОДИМАЯ ИНФОРМАЦИЯ: полная инфа в json:
    return data

# Получить список красивых мест в соответствии с выбранными фильтрами
# входные параметры: можно оставить без фильтров
def get_beautiful_places(area: str = None, categoria: str = None, district: str = None):
    params = {
        "area": area,
        "district": district,
        "categoria": categoria,
    }

    resp = requests.get(f"{main_api}/beautiful_places/", params=params)
    resp.raise_for_status()
    if resp.status_code != 200:
        print(f"код ошибки {resp.status_code}")
        return
    data = resp.json()
    # ВЫОВОДИМАЯ ИНФОРМАЦИЯ: полная инфа в json
    return data

if __name__ == "__main__":
    mfc_data = find_nearest_mfc("Комендантский проспект 61")
    #print(mfc_data)

    mfc_list = get_mfc_by_district("Приморский")
    #print(mfc_list)

    result = get_polyclinics_by_address("Комендантский проспект 61")
    #print(result)

    schools_in_central = get_schools_by_district("Центральный")
    """
    print(len(schools_in_central))
    for s in schools_in_central:
        print(s["name"], "-", s["address"])
    """

    data = get_linked_schools("Комендантский проспект 61")
    #print(data)

    # Все гос. сады в Приморском районе для ребёнка 3 лет
    dou = get_dou(district="Приморский", age_year=3)
    #print(dou)

    #------пенсия--
    #print(pensioner_servis_category())
    #print(pensioner_servis("Приморский"))
    #print(pensioner_servis("Приморский", "Здоровье"))
    #print(pensioner_servis("Приморский", ["Здоровье", "Спорт"]))

    #-------афиша
    #print(afisha_all_category("2025-11-21T00:00:00", "2025-12-22T00:00:00"))
    #print(afisha_all("2025-11-21T00:00:00", "2026-12-22T00:00:00", "Театр", "true"))

    #---------красивые места---
    #print(get_beautiful_places_area())
    #print(get_beautiful_categoria())
    #print(get_beautiful_places())
    #print(get_beautiful_places(area="Районы города", district="Адмиралтейский", categoria="Архитектура"))




