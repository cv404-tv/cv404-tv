import qrcode
from qrcode.constants import ERROR_CORRECT_M

url = "https://ai.builderlab.cn/activities/b53a367e-628e-4e69-b65b-481c122bd2df"
output = "outputs/jev-rocket-covers/registration-qr.png"

qr = qrcode.QRCode(
    version=None,
    error_correction=ERROR_CORRECT_M,
    box_size=16,
    border=4,
)
qr.add_data(url)
qr.make(fit=True)
qr.make_image(fill_color="black", back_color="white").save(output)

print(f"Wrote {output}")
